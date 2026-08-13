import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const DAY_MS = 86_400_000;
const reject = (status: number, code: string, error: string) => NextResponse.json({ code, error }, { status });
const cents = (value: number) => Math.round(value * 100);
const money = (value: number) => Math.round(value) / 100;

function depositMode(config: string): "50_percent" | "100_percent" | "quote_only" {
  try {
    const mode = (JSON.parse(config) as { deposit_mode?: unknown }).deposit_mode;
    if (mode === "100_percent" || mode === "quote_only") return mode;
  } catch { /* legacy config falls back to 50% */ }
  return "50_percent";
}

function parseIds(value: unknown) {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string" || !id.trim())) return null;
  const ids = value.map((id) => id.trim());
  return new Set(ids).size === ids.length ? ids : null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tenantId = typeof body.tenantId === "string" ? body.tenantId.trim() : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const eventDate = typeof body.eventDate === "string" ? body.eventDate.trim() : "";
    const cakeSizeId = typeof body.cakeSizeId === "string" ? body.cakeSizeId.trim() : "";
    const flavorId = typeof body.flavorId === "string" ? body.flavorId.trim() : "";
    const fillingIds = parseIds(body.fillingIds);
    const addonIds = parseIds(body.addonIds ?? []);

    if (!tenantId || !customerName || !customerPhone || !eventDate || !cakeSizeId || !flavorId || !fillingIds || !addonIds) {
      return reject(400, "INVALID_REQUEST", "Campos obrigatórios ausentes ou inválidos");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) return reject(400, "INVALID_EVENT_DATE", "Data do evento inválida");
    const event = new Date(`${eventDate}T12:00:00.000Z`);
    if (Number.isNaN(event.getTime()) || event.toISOString().slice(0, 10) !== eventDate) {
      return reject(400, "INVALID_EVENT_DATE", "Data do evento inválida");
    }

    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
      if (!tenant) return reject(404, "TENANT_NOT_FOUND", "Ateliê não encontrado");

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

      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const targetUtc = Date.UTC(event.getUTCFullYear(), event.getUTCMonth(), event.getUTCDate());
      if (Math.floor((targetUtc - todayUtc) / DAY_MS) < tenant.minLeadDays) {
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
      const mode = depositMode(tenant.featuresConfig);
      const depositAmount = mode === "quote_only" ? 0 : mode === "100_percent" ? subtotal : money(Math.round(totalCents / 2));

      const order = await tx.order.create({ data: {
        tenantId, customerName, customerPhone, eventDate, cakeSizeId: size.id, flavorId: dough.id,
        fillingIds: JSON.stringify(fillingIds), addonIds: JSON.stringify(addonIds),
        referenceImageUrl: typeof body.referenceImageUrl === "string" ? body.referenceImageUrl.trim() : "",
        cakeMessage: typeof body.cakeMessage === "string" ? body.cakeMessage.trim() : "",
        details: typeof body.details === "string" ? body.details.trim() : "",
        subtotal, depositAmount, depositMode: mode, status: "pending",
      }});
      return { order, pricing: { subtotal, depositAmount, depositMode: mode } };
    });

    if (result instanceof NextResponse) return result;
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[ERROR] Failed to create order", error instanceof Error ? error.message : "unknown error");
    return reject(500, "ORDER_CREATE_FAILED", "Erro ao criar pedido");
  }
}
