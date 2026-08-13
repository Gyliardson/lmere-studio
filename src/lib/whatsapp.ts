import type { SimulatorState, TenantData, CakeFlavorData, AddonData } from "./types";
import { formatCurrency } from "./pricing";

interface OrderPricing {
  subtotal: number;
  depositAmount: number;
  depositMode: "50_percent" | "100_percent" | "quote_only";
}

interface OrderResponse {
  order: { id: string };
  pricing: OrderPricing;
  idempotentReplay: boolean;
}

const orderKeys = new Map<string, string>();
const pendingMessages = new Map<string, Promise<string>>();

function orderSignature(state: SimulatorState, tenant: TenantData) {
  return JSON.stringify({
    tenantId: tenant.id,
    customerName: state.customerName.trim(),
    customerPhone: state.customerPhone.replace(/\D/g, ""),
    eventDate: state.eventDate,
    cakeSizeId: state.cakeSize?.id,
    flavorId: state.dough?.id,
    fillingIds: state.fillings.map((item) => item.id),
    addonIds: state.addons.map((item) => item.id),
    cakeMessage: state.cakeMessage,
    details: state.details,
  });
}

function idempotencyKey(signature: string) {
  const existing = orderKeys.get(signature);
  if (existing) return existing;
  const key = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  orderKeys.set(signature, key);
  return key;
}

async function createServerOrder(state: SimulatorState, tenant: TenantData): Promise<OrderResponse> {
  if (!state.eventDate || !state.cakeSize || !state.dough || !state.fillings.length) {
    throw new Error("Revise os dados obrigatórios do pedido antes de enviar.");
  }

  const signature = orderSignature(state, tenant);
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey(signature),
    },
    body: JSON.stringify({
      tenantId: tenant.id,
      customerName: state.customerName,
      customerPhone: state.customerPhone,
      eventDate: state.eventDate,
      cakeSizeId: state.cakeSize.id,
      flavorId: state.dough.id,
      fillingIds: state.fillings.map((item) => item.id),
      addonIds: state.addons.map((item) => item.id),
      referenceImageUrl: state.referenceImage ?? "",
      cakeMessage: state.cakeMessage,
      details: state.details,
    }),
  });

  const payload = await response.json().catch(() => null) as (OrderResponse & { error?: string }) | null;
  if (!response.ok || !payload?.order || !payload.pricing) {
    throw new Error(payload?.error || "Não foi possível confirmar o pedido. Tente novamente.");
  }

  return payload;
}

async function buildConfirmedMessage(
  state: SimulatorState,
  tenant: TenantData,
): Promise<string> {
  const confirmed = await createServerOrder(state, tenant);
  const { subtotal, depositAmount, depositMode } = confirmed.pricing;

  const lines: string[] = [
    `*Novo Pedido - ${tenant.name}*`,
    `*Pedido:* ${confirmed.order.id}`,
    "",
    `*Cliente:* ${state.customerName}`,
    `*Telefone:* ${state.customerPhone}`,
    `*Data do Evento:* ${formatDateBR(state.eventDate)}`,
    "",
    "*--- Detalhes do Bolo ---*",
    "",
    `*Tamanho:* ${state.cakeSize?.name} (${state.cakeSize?.servings} / ${state.cakeSize?.weightKg}kg)`,
    `*Massa:* ${state.dough?.name}`,
  ];

  if (state.fillings.length > 0) {
    lines.push(`*Recheio(s):* ${state.fillings.map((item) => item.name).join(", ")}`);
  }

  if (state.addons.length > 0) {
    lines.push("");
    lines.push("*Adicionais:*");
    for (const addon of state.addons) lines.push(`  - ${addon.name}`);
  }

  if (state.cakeMessage) {
    lines.push("");
    lines.push(`*Mensagem/Placa:* ${state.cakeMessage}`);
  }
  if (state.details) lines.push(`*Observações:* ${state.details}`);

  lines.push("");
  lines.push("*--- Valores confirmados pelo servidor ---*");
  lines.push(`*Total:* ${formatCurrency(subtotal)}`);
  if (depositMode === "50_percent") lines.push(`*Sinal (50%):* ${formatCurrency(depositAmount)}`);
  if (depositMode === "100_percent") lines.push(`*Pagamento integral:* ${formatCurrency(depositAmount)}`);
  if (tenant.pixKey && depositAmount > 0) lines.push(`*Chave PIX:* ${tenant.pixKey}`);

  return lines.join("\n");
}

export function buildWhatsAppMessage(
  state: SimulatorState,
  tenant: TenantData,
  _allFillings: CakeFlavorData[],
  _allAddons: AddonData[],
): Promise<string> {
  const signature = orderSignature(state, tenant);
  const pending = pendingMessages.get(signature);
  if (pending) return pending;

  const operation = buildConfirmedMessage(state, tenant).finally(() => {
    pendingMessages.delete(signature);
  });
  pendingMessages.set(signature, operation);
  return operation;
}

export function openWhatsApp(phone: string, message: string | Promise<string>): void {
  const popup = window.open("about:blank", "_blank");

  void Promise.resolve(message)
    .then((resolvedMessage) => {
      const encodedMessage = encodeURIComponent(resolvedMessage);
      const cleanPhone = phone.replace(/\D/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      if (popup) popup.location.href = url;
      else window.location.href = url;
    })
    .catch((error: unknown) => {
      popup?.close();
      window.alert(error instanceof Error ? error.message : "Não foi possível confirmar o pedido.");
    });
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "Não definida";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
