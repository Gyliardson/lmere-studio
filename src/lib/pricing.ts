import type { CakeSizeData, CakeFlavorData, AddonData, FeaturesConfig } from "./types";

export function calculateOrderTotal(
  size: CakeSizeData | null,
  dough: CakeFlavorData | null,
  fillings: CakeFlavorData[],
  addons: AddonData[]
): number {
  if (!size) return 0;

  let total = size.basePrice;

  if (dough && dough.additionalPrice > 0) {
    total += dough.additionalPrice;
  }

  for (const filling of fillings) {
    total += filling.additionalPrice;
  }

  for (const addon of addons) {
    total += addon.price;
  }

  return Math.round(total * 100) / 100;
}

export function calculateDeposit(
  total: number,
  depositMode: FeaturesConfig["deposit_mode"]
): number {
  switch (depositMode) {
    case "50_percent":
      return Math.round((total * 0.5) * 100) / 100;
    case "100_percent":
      return total;
    case "quote_only":
      return 0;
    default:
      return Math.round((total * 0.5) * 100) / 100;
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
