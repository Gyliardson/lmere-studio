import type { SimulatorState, TenantData, CakeFlavorData, AddonData, CustomFieldSnapshot } from "./types";
import { ORDER_TEXT_LIMITS, orderTextWithinLimit } from "./order-validation";
import { formatCurrency } from "./pricing";

interface OrderPricing {
  subtotal: number;
  depositAmount: number;
  depositMode: "50_percent" | "100_percent" | "quote_only";
}

interface OrderResponse {
  order: { id: string };
  pricing: OrderPricing;
  customFields: CustomFieldSnapshot[];
  idempotentReplay: boolean;
}

interface ConfirmedHandoff {
  message: string;
  orderId: string;
  pricing: OrderPricing;
}

export class OrderSubmissionError extends Error {
  constructor(message: string, readonly code: string, readonly status: number) {
    super(message);
    this.name = "OrderSubmissionError";
  }
}

class AmbiguousOrderSubmissionError extends Error {
  constructor(message = "Não foi possível confirmar se o pedido foi recebido. Tente novamente para recuperar a mesma tentativa com segurança.") {
    super(message);
    this.name = "AmbiguousOrderSubmissionError";
  }
}

const pendingMessages = new Map<string, Promise<ConfirmedHandoff>>();
const retryIdempotencyKeys = new Map<string, string>();
const handoffWindows = new WeakMap<Promise<ConfirmedHandoff>, Window | null>();

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
    referenceImage: state.referenceImage,
    cakeMessage: state.cakeMessage,
    details: state.details,
    customFieldAnswers: state.customFieldAnswers,
  });
}

function newIdempotencyKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function assertTextLimits(state: SimulatorState) {
  if (!orderTextWithinLimit(state.customerName, ORDER_TEXT_LIMITS.customerName)) throw new OrderSubmissionError(`O nome do cliente deve ter no máximo ${ORDER_TEXT_LIMITS.customerName} caracteres.`, "CUSTOMER_NAME_TOO_LONG", 422);
  if (!orderTextWithinLimit(state.cakeMessage, ORDER_TEXT_LIMITS.cakeMessage)) throw new OrderSubmissionError(`A mensagem do bolo deve ter no máximo ${ORDER_TEXT_LIMITS.cakeMessage} caracteres.`, "CAKE_MESSAGE_TOO_LONG", 422);
  if (!orderTextWithinLimit(state.details, ORDER_TEXT_LIMITS.details)) throw new OrderSubmissionError(`As observações devem ter no máximo ${ORDER_TEXT_LIMITS.details} caracteres.`, "ORDER_DETAILS_TOO_LONG", 422);
}

async function createServerOrder(state: SimulatorState, tenant: TenantData, idempotencyKey: string): Promise<OrderResponse> {
  if (!state.eventDate || !state.cakeSize || !state.dough || !state.fillings.length) {
    throw new OrderSubmissionError("Revise os dados obrigatórios do pedido antes de enviar.", "INVALID_REQUEST", 400);
  }
  assertTextLimits(state);

  let response: Response;
  try {
    response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
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
        customFieldAnswers: state.customFieldAnswers,
      }),
    });
  } catch {
    throw new AmbiguousOrderSubmissionError();
  }

  const payload = await response.json().catch(() => null) as (OrderResponse & { code?: string; error?: string }) | null;
  if (!response.ok) throw new OrderSubmissionError(payload?.error || "Não foi possível confirmar o pedido. Tente novamente.", payload?.code || "ORDER_CREATE_FAILED", response.status);
  if (!payload?.order || !payload.pricing || !Array.isArray(payload.customFields)) throw new AmbiguousOrderSubmissionError();
  return payload;
}

async function buildConfirmedHandoff(state: SimulatorState, tenant: TenantData, idempotencyKey: string): Promise<ConfirmedHandoff> {
  const confirmed = await createServerOrder(state, tenant, idempotencyKey);
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

  if (state.fillings.length > 0) lines.push(`*Recheio(s):* ${state.fillings.map((item) => item.name).join(", ")}`);
  if (state.addons.length > 0) {
    lines.push("", "*Adicionais:*");
    for (const addon of state.addons) lines.push(`  - ${addon.name}`);
  }
  if (state.cakeMessage) lines.push("", `*Mensagem/Placa:* ${state.cakeMessage}`);
  if (state.details) lines.push(`*Observações:* ${state.details}`);
  if (confirmed.customFields.length > 0) {
    lines.push("", "*Informações personalizadas:*");
    for (const field of confirmed.customFields) lines.push(`*${field.label}:* ${field.value}`);
  }

  lines.push("", "*--- Valores confirmados pelo servidor ---*", `*Total:* ${formatCurrency(subtotal)}`);
  if (depositMode === "50_percent") lines.push(`*Sinal (50%):* ${formatCurrency(depositAmount)}`);
  if (depositMode === "100_percent") lines.push(`*Pagamento integral:* ${formatCurrency(depositAmount)}`);
  if (tenant.pixKey && depositAmount > 0) lines.push(`*Chave PIX:* ${tenant.pixKey}`);

  return { message: lines.join("\n"), orderId: confirmed.order.id, pricing: confirmed.pricing };
}

export function buildWhatsAppMessage(state: SimulatorState, tenant: TenantData, _allFillings: CakeFlavorData[], _allAddons: AddonData[]): Promise<ConfirmedHandoff> {
  const signature = orderSignature(state, tenant);
  const pending = pendingMessages.get(signature);
  if (pending) return pending;
  const idempotencyKey = retryIdempotencyKeys.get(signature) ?? newIdempotencyKey();
  retryIdempotencyKeys.set(signature, idempotencyKey);

  const operation = buildConfirmedHandoff(state, tenant, idempotencyKey)
    .then((confirmed) => { retryIdempotencyKeys.delete(signature); return confirmed; })
    .catch((error: unknown) => { if (error instanceof OrderSubmissionError) retryIdempotencyKeys.delete(signature); throw error; })
    .finally(() => { pendingMessages.delete(signature); });
  pendingMessages.set(signature, operation);
  return operation;
}

function submissionButton() {
  return document.querySelector<HTMLButtonElement>("#btn-send-whatsapp");
}

function renderSubmissionStatus(state: "submitting" | "confirmed" | "error", message: string, code?: string) {
  const button = submissionButton();
  if (!button?.parentElement) return null;
  let status = document.querySelector<HTMLDivElement>("#order-submit-status");
  if (!status) {
    status = document.createElement("div");
    status.id = "order-submit-status";
    status.className = "glass-card p-3 mb-3 text-sm leading-relaxed";
    status.tabIndex = -1;
    button.insertAdjacentElement("beforebegin", status);
  }
  status.dataset.state = state;
  if (code) status.dataset.code = code; else delete status.dataset.code;
  status.setAttribute("role", state === "error" ? "alert" : "status");
  status.setAttribute("aria-live", state === "error" ? "assertive" : "polite");
  status.setAttribute("aria-atomic", "true");
  status.textContent = message;
  button.setAttribute("aria-describedby", status.id);
  return status;
}

function setButtonSubmitting(button: HTMLButtonElement | null, submitting: boolean) {
  if (!button) return;
  button.disabled = submitting;
  button.setAttribute("aria-busy", submitting ? "true" : "false");
  button.dataset.submissionState = submitting ? "submitting" : "idle";
}

export function openWhatsApp(phone: string, submission: Promise<ConfirmedHandoff>): void {
  const operation = submission;
  if (handoffWindows.has(operation)) return;
  const button = submissionButton();
  setButtonSubmitting(button, true);
  renderSubmissionStatus("submitting", "Confirmando disponibilidade e valores no servidor antes de abrir o WhatsApp. Os valores exibidos acima são uma estimativa até esta confirmação.");
  const popup = window.open("about:blank", "_blank");
  handoffWindows.set(operation, popup);

  void operation
    .then((confirmed) => {
      const { subtotal, depositAmount, depositMode } = confirmed.pricing;
      const payment = depositMode === "quote_only" ? "Sem sinal automático" : `Sinal confirmado: ${formatCurrency(depositAmount)}`;
      renderSubmissionStatus("confirmed", `Pedido ${confirmed.orderId} confirmado. Total confirmado pelo servidor: ${formatCurrency(subtotal)}. ${payment}. Abrindo WhatsApp.`);
      const encodedMessage = encodeURIComponent(confirmed.message);
      const cleanPhone = phone.replace(/\D/g, "");
      const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
      if (popup) popup.location.href = url; else window.location.href = url;
    })
    .catch((error: unknown) => {
      popup?.close();
      const message = error instanceof Error ? error.message : "Não foi possível confirmar o pedido.";
      const code = error instanceof OrderSubmissionError ? error.code : "ORDER_CONFIRMATION_UNKNOWN";
      const status = renderSubmissionStatus("error", message, code);
      status?.focus({ preventScroll: false });
    })
    .finally(() => {
      setButtonSubmitting(button, false);
      handoffWindows.delete(operation);
    });
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "Não definida";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
