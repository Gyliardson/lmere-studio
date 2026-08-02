export interface TenantData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string;
  bannerUrl: string;
  whatsapp: string;
  pixKey: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  shadowColor: string;
  textColor: string;
  maxOrdersPerDay: number;
  minLeadDays: number;
  featuresConfig: FeaturesConfig;
}

export interface FeaturesConfig {
  allow_photo_upload: boolean;
  deposit_mode: "50_percent" | "100_percent" | "quote_only";
  enable_delivery_step: boolean;
  custom_fields: CustomFieldDef[];
}

export interface CustomFieldDef {
  label: string;
  type: "text" | "select" | "number";
  required: boolean;
  options?: string[];
}

export interface CakeSizeData {
  id: string;
  name: string;
  servings: string;
  weightKg: number;
  basePrice: number;
  maxFillings: number;
  sortOrder: number;
  active: boolean;
}

export interface CakeFlavorData {
  id: string;
  name: string;
  type: "MASSA" | "RECHEIO";
  additionalPrice: number;
  isSpecial: boolean;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

export interface AddonData {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  active: boolean;
  sortOrder: number;
}

export interface BlockedDateData {
  id: string;
  date: string;
  reason: string;
}

export interface WorkScheduleData {
  dayOfWeek: number;
  isOpen: boolean;
}

export interface OrderData {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  cakeSizeId: string;
  flavorId: string;
  fillingIds: string[];
  addonIds: string[];
  referenceImageUrl: string;
  cakeMessage: string;
  details: string;
  subtotal: number;
  depositAmount: number;
  depositMode: string;
  status: string;
  createdAt: string;
}

export interface SimulatorState {
  step: number;
  eventDate: string | null;
  cakeSize: CakeSizeData | null;
  dough: CakeFlavorData | null;
  fillings: CakeFlavorData[];
  addons: AddonData[];
  referenceImage: string | null;
  cakeMessage: string;
  details: string;
  customerName: string;
  customerPhone: string;
}

export interface TenantFullData {
  tenant: TenantData;
  sizes: CakeSizeData[];
  doughs: CakeFlavorData[];
  fillings: CakeFlavorData[];
  addons: AddonData[];
  blockedDates: BlockedDateData[];
  workSchedule: WorkScheduleData[];
}

export interface ColorPreset {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  buttonColor: string;
  shadowColor: string;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "velvet",
    name: "Velvet Luxury",
    primaryColor: "#8B5CF6",
    secondaryColor: "#EC4899",
    backgroundColor: "#0F0A1A",
    buttonColor: "#8B5CF6",
    shadowColor: "#8B5CF6",
  },
  {
    id: "rose",
    name: "Doce Rosê",
    primaryColor: "#F43F5E",
    secondaryColor: "#F59E0B",
    backgroundColor: "#180A0F",
    buttonColor: "#F43F5E",
    shadowColor: "#F43F5E",
  },
  {
    id: "gourmet",
    name: "Confeitaria Gourmet",
    primaryColor: "#D97706",
    secondaryColor: "#F59E0B",
    backgroundColor: "#120D0A",
    buttonColor: "#D97706",
    shadowColor: "#D97706",
  },
  {
    id: "mint",
    name: "Ateliê Minimalista",
    primaryColor: "#10B981",
    secondaryColor: "#06B6D4",
    backgroundColor: "#061412",
    buttonColor: "#10B981",
    shadowColor: "#10B981",
  },
  {
    id: "serene",
    name: "Pastel Chic",
    primaryColor: "#3B82F6",
    secondaryColor: "#8B5CF6",
    backgroundColor: "#090D1A",
    buttonColor: "#3B82F6",
    shadowColor: "#3B82F6",
  },
  {
    id: "night",
    name: "Noite Estrelada",
    primaryColor: "#6366F1",
    secondaryColor: "#D946EF",
    backgroundColor: "#0B0B1E",
    buttonColor: "#6366F1",
    shadowColor: "#6366F1",
  },
];
