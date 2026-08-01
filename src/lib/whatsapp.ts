import type { SimulatorState, TenantData, CakeFlavorData, AddonData } from "./types";
import { formatCurrency, calculateOrderTotal, calculateDeposit } from "./pricing";
import type { FeaturesConfig } from "./types";

export function buildWhatsAppMessage(
  state: SimulatorState,
  tenant: TenantData,
  allFillings: CakeFlavorData[],
  allAddons: AddonData[]
): string {
  const total = calculateOrderTotal(
    state.cakeSize,
    state.dough,
    state.fillings,
    state.addons
  );
  const deposit = calculateDeposit(total, tenant.featuresConfig.deposit_mode);

  const lines: string[] = [
    `*Novo Pedido - ${tenant.name}*`,
    "",
    `*Cliente:* ${state.customerName}`,
    `*Telefone:* ${state.customerPhone}`,
    `*Data do Evento:* ${formatDateBR(state.eventDate)}`,
    "",
    "*--- Detalhes do Bolo ---*",
    "",
    `*Tamanho:* ${state.cakeSize?.name} (${state.cakeSize?.servings} / ${state.cakeSize?.weightKg}kg)`,
    `*Massa:* ${state.dough?.name}${state.dough?.additionalPrice ? ` (+${formatCurrency(state.dough.additionalPrice)})` : ""}`,
  ];

  if (state.fillings.length > 0) {
    const fillingNames = state.fillings
      .map((f) => `${f.name}${f.additionalPrice > 0 ? ` (+${formatCurrency(f.additionalPrice)})` : ""}`)
      .join(", ");
    lines.push(`*Recheio(s):* ${fillingNames}`);
  }

  if (state.addons.length > 0) {
    lines.push("");
    lines.push("*Adicionais:*");
    for (const addon of state.addons) {
      lines.push(`  - ${addon.name} (${formatCurrency(addon.price)})`);
    }
  }

  if (state.cakeMessage) {
    lines.push("");
    lines.push(`*Mensagem/Placa:* ${state.cakeMessage}`);
  }

  if (state.details) {
    lines.push(`*Observacoes:* ${state.details}`);
  }

  lines.push("");
  lines.push("*--- Valores ---*");
  lines.push(`*Total:* ${formatCurrency(total)}`);

  if (tenant.featuresConfig.deposit_mode === "50_percent") {
    lines.push(`*Sinal (50%):* ${formatCurrency(deposit)}`);
  } else if (tenant.featuresConfig.deposit_mode === "100_percent") {
    lines.push(`*Pagamento integral:* ${formatCurrency(deposit)}`);
  }

  if (tenant.pixKey) {
    lines.push(`*Chave PIX:* ${tenant.pixKey}`);
  }

  return lines.join("\n");
}

export function openWhatsApp(phone: string, message: string): void {
  const encodedMessage = encodeURIComponent(message);
  const cleanPhone = phone.replace(/\D/g, "");
  const url = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
  window.open(url, "_blank");
}

function formatDateBR(dateStr: string | null): string {
  if (!dateStr) return "Nao definida";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
