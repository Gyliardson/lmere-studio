import { Prisma } from "@prisma/client";
import { normalizePersistedFeaturesConfig } from "@/lib/features-config";
import { validateImageReference } from "@/lib/image-reference";
import { prisma } from "@/lib/prisma";
import { calendarLeadDays, normalizeBrazilianPhone } from "@/lib/order-validation";
import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

const MAX_IDEMPOTENCY_KEY_LENGTH = 128;
const MAX_TRANSACTION_RETRIES = 8;
const PUBLIC_ORDER_SOURCE_RATE_LIMIT = { scope: "public-order-source", limit: 60, windowMs: 10 * 60 * 1000 } as const;
const PUBLIC_ORDER_TENANT_RATE_LIMIT = { scope: "public-order-tenant", limit: 30, windowMs: 10 * 60 * 1000 } as const;
const reject = (status: number, code: string, error: string, headers?: HeadersInit) => NextResponse.json({ code, error }, { status, headers });
const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => Math.round(value) / 100;

function rateLimitedResponse(rateLimit: Awaited<ReturnType<typeof consumeRateLimit>>) {
  return reject(
    429,
    "RATE_LIMITED",
    "Muitas tentativas de pedido. Tente novamente em instantes.",
    rateLimitHeaders(rateLimit),
  );
}

function depositMode(config: string): "50_percent" | "100_percent" | "quote_only" | null {
  try {
    const parsed = normalizePersistedFeaturesConfig(JSON.parse(config) as unknown);
    return parsed.ok ? parsed.value.deposit_mode : null;
  } catch {
    return null;
  }
}

function parseIds(value: unknown) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) return null;
  const ids = value.map((id) => id.trim());
  return new Set(ids).size === ids.length ? ids : null;
}

function parseIdempotencyKey(request: Request, body: Record<string, unknown>) {
  const candidate = request.headers.get("idempotency-key") ?? body.idempotencyKey;
  if (candidate == null || candidate === "") return { key: null, valid: true };
  if (typeof candidate !== "string") return { key: null, valid: false };
  const key = candidate.trim();
  return { key, valid: key.length > 0 && key.length <= MAX_IDEMPOTENCY_KEY_LENGTH };
}

function retryableTransactionError(error: unknown, hasIdempotencyKey: boolean) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034" || (hasIdempotencyKey && error.code === "P2002");
  }

  // Prisma's pg driver adapter can surface PostgreSQL serialization failures
  // through the adapter error message instead of a PrismaKnownRequestError code.
  // Keep this fallback intentionally narrow: only the adapter's explicit
  // transaction-conflict signal is retried.
  return error instanceof Error && error.message.includes("TransactionWriteConflict");
}

function retryDelay(attempt: number) {
  return new Promise((resolve) => setTimeout(resolve, Math.min(10 * 2 ** attempt, 160)));
}

export async function POST(request: Request) {
  try {
    const sourceLimit = await consumeRateLimit(request, PUBLIC_ORDER_SOURCE_RATE_LIMIT);
    if (!sourceLimit.allowed) return rateLimitedResponse(sourceLimit);

    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return reject(400, "INVALID_JSON", "Corpo JSON inválido");
      }
      body = parsed as Record<string, unknown>;
    } catch {
      return reject(400, "INVALID_JSON", "Corpo JSON inválido");
    }

    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    if (tenantId) {
      const tenantLimit = await consumeRateLimit(request, {
        ...PUBLIC_ORDER_TENANT_RATE_LIMIT,
        subject: tenantId,
      });
      if (!tenantLimit.allowed) return rateLimitedResponse(tenantLimit);
    }

    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhoneRaw = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const customerPhone = normalizeBrazilianPhone(customerPhoneRaw);
    const eventDate = typeof body.eventDate === "string" ? body.eventDate.trim() : "";
    const cakeSizeId = typeof body.cakeSizeId === "string" ? body.cakeSizeId.trim() : "";
    const flavorId = typeof body.flavorId === "string" ? body.flavorId.trim() : "";
    const fillingIds = parseIds(body.fillingIds);
    const addonIds = parseIds(body.addonIds ?? []);
    const idempotency = parseIdempotencyKey(request, body);
    const referenceImage = validateImageReference(body.referenceImageUrl ?? "");

    if (!idempotency.valid) {
      return reject(400, "INVALID_IDEMPOTENCY_KEY", `A chave de idempotência deve ter entre 1 e ${MAX_IDEMPOTENCY_KEY_LENGTH} caracteres`);
    }
    if (!referenceImage.ok) {
      return reject(400, "INVALID_REFERENCE_IMAGE", referenceImage.message);
    }
    if (!tenantId || !customerName || !eventDate || !cakeSizeId || !flavorId || !fillingIds || !addonIds) {
      return reject(400, "INVALID_REQUEST", "Campos obrigatórios ausentes ou inválidos");
    }
    if (!customerPhone) {
      return reject(400, "INVALID_CUSTOMER_PHONE", "Informe um telefone/WhatsApp válido com DDD");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return reject(400, "INVALID_EVENT_DATE", "Data do evento inválida");
    const event = new Date(`${eventDate}T12:00:00.000Z`);
    if (Number.isNaN(event.getTime()) || event.toISOString().slice(0, 10) !== eventDate) {
      return reject(400, "INVALID_EVENT_DATE", "Data do evento inválida");
    }

    for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
      try {
        const result = await prisma.$transaction(async (tx) => {
          const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
          if (!tenant) return reject(404, "TENANT_NOT_FOUND", "Ateliê não encontrado");

          if (idempotency.key) {
            const existing = await tx.order.findFirst({ where: { tenantId, idempotencyKey: idempotency.key } });
            if (existing) {
              return {
                order: existing,
                pricing: {
                  subtotal: existing.subtotal,
                  depositAmount: existing.depositAmount,
                  depositMode: existing.depositMode,
                },
                idempotentReplay: true,
              };
            }
          }

          const mode = depositMode(tenant.featuresConfig);
          if (!mode) return reject(500, "INVALID_TENANT_CONFIG", "Configuração financeira do ateliê inválida");

          const size = await tx.cakeSize.findFirst({ where: { id: cakeSizeId, tenantId, active: true } });
          if (!size) return reject(400, "INVALID_CAKE_SIZE", "Tamanho inválido ou indisponível");

          const dough = await tx.cakeFlavor.findFirst({ where: { id: flavorId, tenantId, active: true, type: "MASSA" } });
          if (!dough) return reject(400, "INVALID_DOUGH", "Massa inválida ou indisponível");
          if (!fillingIds.length) return reject(400, "FILLING_REQUIRED", "Selecione ao menos um recheio");
          if (fillingIds.length > size.maxFillings) return reject(400, "TOO_MANY_FILLINGS", `Este tamanho aceita no máximo ${size.maxFillings} recheios`);

          const fillings = await tx.cakeFlavor.findMany({ where: { id: { in: fillingIds }, tenantId, active: true, type: "RECHEIO" } });
          if (fillings.length !== fillingIds.length) return reject(400, "INVALID_FILLING", "Um ou mais recheios são inválidos ou indisponíveis");
          const addons = addonIds.length ? await tx.addon.findMany({ where: { id: { in: addonIds }, tenantId, active: true } }) : [];
          if (addons.length !== addonIds.length) return reject(400, "INVALID_ADDON", "Um ou mais adicionais são inválidos ou indisponíveis");

          const leadDays = calendarLeadDays(eventDate);
          if (leadDays == null) return reject(400, "INVALID_EVENT_DATE", "Data do evento inválida");
          if (leadDays < tenant.minLeadDays) {
            return reject(409, "LEAD_TIME_UNAVAILABLE", `A data exige antecedência mínima de ${tenant.minLeadDays} dias`);
          }
          if (await tx.blockedDate.findFirst({ where: { tenantId, date: eventDate } })) return reject(409, "DATE_BLOCKED", "A data selecionada está indisponível");
          const schedule = await tx.workSchedule.findFirst({ where: { tenantId, dayOfWeek: event.getUTCDay() } });
          if (schedule && !schedule.isOpen) return reject(409, "CLOSED_WEEKDAY", "O ateliê não atende neste dia da semana");
          const dailyOrders = await tx.order.count({ where: { tenantId, eventDate, status: { not: "cancelled" } } });
          if (dailyOrders >= tenant.maxOrdersPerDay) return reject(409, "DAILY_CAPACITY_REACHED", "A capacidade de pedidos para esta data foi atingida");

          const totalCents = cents(size.basePrice) + cents(dough.additionalPrice)
            + fillings.reduce((sum, item) => sum + cents(item.additionalPrice), 0)
            + addons.reduce((sum, item) => sum + cents(item.price), 0);
          const subtotal = money(totalCents);
          const depositAmount = mode === "quote_only" ? 0 : mode === "100_percent" ? subtotal : money(Math.round(totalCents / 2));
          const selectionSnapshot = JSON.stringify({
            version: 1,
            size: { id: size.id, name: size.name, basePrice: size.basePrice, maxFillings: size.maxFillings },
            dough: { id: dough.id, name: dough.name, additionalPrice: dough.additionalPrice },
            fillings: fillingIds.map((id) => {
              const item = fillings.find((candidate) => candidate.id === id)!;
              return { id: item.id, name: item.name, additionalPrice: item.additionalPrice };
            }),
            addons: addonIds.map((id) => {
              const item = addons.find((candidate) => candidate.id === id)!;
              return { id: item.id, name: item.name, price: item.price };
            }),
            pricing: { subtotal, depositAmount, depositMode: mode },
          });

          const order = await tx.order.create({ data: {
            tenantId,
            customerName,
            customerPhone,
            eventDate,
            cakeSizeId: size.id,
            flavorId: dough.id,
            fillingIds: JSON.stringify(fillingIds),
            addonIds: JSON.stringify(addonIds),
            referenceImageUrl: referenceImage.value,
            cakeMessage: typeof body.cakeMessage === "string" ? body.cakeMessage.trim() : "",
            details: typeof body.details === "string" ? body.details.trim() : "",
            subtotal,
            depositAmount,
            depositMode: mode,
            status: "pending",
            idempotencyKey: idempotency.key,
            selectionSnapshot,
          }});
          return { order, pricing: { subtotal, depositAmount, depositMode: mode }, idempotentReplay: false };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

        if (result instanceof NextResponse) return result;
        return NextResponse.json(result, { status: result.idempotentReplay ? 200 : 201 });
      } catch (error) {
        if (retryableTransactionError(error, Boolean(idempotency.key))) {
          if (attempt + 1 >= MAX_TRANSACTION_RETRIES) {
            return reject(503, "ORDER_RETRY_EXHAUSTED", "Não foi possível confirmar o pedido; tente novamente");
          }
          await retryDelay(attempt);
          continue;
        }
        throw error;
      }
    }

    return reject(503, "ORDER_RETRY_EXHAUSTED", "Não foi possível confirmar o pedido; tente novamente");
  } catch (error) {
    console.error("[ERROR] Failed to create order", error instanceof Error ? error.message : "unknown error");
    return reject(500, "ORDER_CREATE_FAILED", "Erro ao criar pedido");
  }
}
