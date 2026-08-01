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
  textColor: string;
  maxOrdersPerDay: number;
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
