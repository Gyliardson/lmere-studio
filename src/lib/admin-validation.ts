import type { CustomFieldDef, FeaturesConfig } from "./types";
import { formatPhoneBR, isValidPhoneBR } from "./utils";

export const ADMIN_LIMITS = {
  text: 120,
  description: 500,
  money: 1_000_000,
  weightKg: 100,
  maxFillings: 10,
  sortOrder: 10_000,
  maxOrdersPerDay: 50,
  minLeadDays: 30,
  customFields: 20,
  customFieldOptions: 50,
  imageDataUrlChars: 7_000_000,
} as const;

export type ValidationIssue = { field: string; message: string };
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export type MenuItemType = "size" | "flavor" | "addon";

type SizeData = {
  name: string;
  servings: string;
  weightKg: number;
  basePrice: number;
  maxFillings: number;
  sortOrder: number;
  active: boolean;
};

type FlavorData = {
  name: string;
  type: "MASSA" | "RECHEIO";
  additionalPrice: number;
  isSpecial: boolean;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

type AddonData = {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
};

export type MenuCreateInput =
  | { itemType: "size"; data: SizeData }
  | { itemType: "flavor"; data: FlavorData }
  | { itemType: "addon"; data: AddonData };

export type MenuUpdateInput =
  | { id: string; itemType: "size"; data: Partial<SizeData> }
  | { id: string; itemType: "flavor"; data: Partial<FlavorData> }
  | { id: string; itemType: "addon"; data: Partial<AddonData> };

export type TenantSettingsUpdate = Partial<{
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
  featuresConfig: string;
}>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function issue(issues: ValidationIssue[], field: string, message: string) {
  issues.push({ field, message });
}

function defaultIfUndefined(value: unknown, fallback: unknown): unknown {
  return value === undefined ? fallback : value;
}

function stringValue(
  value: unknown,
  field: string,
  issues: ValidationIssue[],
  options: { min?: number; max?: number; allowEmpty?: boolean } = {},
): string | undefined {
  if (typeof value !== "string") {
    issue(issues, field, "deve ser texto");
    return undefined;
  }
  const normalized = value.trim();
  const min = options.min ?? (options.allowEmpty ? 0 : 1);
  const max = options.max ?? ADMIN_LIMITS.text;
  if (normalized.length < min) {
    issue(issues, field, options.allowEmpty ? "é inválido" : "não pode ficar vazio");
    return undefined;
  }
  if (normalized.length > max) {
    issue(issues, field, `deve ter no máximo ${max} caracteres`);
    return undefined;
  }
  return normalized;
}

function numberValue(
  value: unknown,
  field: string,
  issues: ValidationIssue[],
  options: { min: number; max: number; integer?: boolean },
): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issue(issues, field, "deve ser um número JSON finito");
    return undefined;
  }
  if (options.integer && !Number.isInteger(value)) {
    issue(issues, field, "deve ser um número inteiro");
    return undefined;
  }
  if (value < options.min || value > options.max) {
    issue(issues, field, `deve estar entre ${options.min} e ${options.max}`);
    return undefined;
  }
  return value;
}

function booleanValue(value: unknown, field: string, issues: ValidationIssue[]): boolean | undefined {
  if (typeof value !== "boolean") {
    issue(issues, field, "deve ser booleano");
    return undefined;
  }
  return value;
}

function enumValue<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  issues: ValidationIssue[],
): T | undefined {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issue(issues, field, `valor suportado: ${allowed.join(", ")}`);
    return undefined;
  }
  return value as T;
}

function imageValue(value: unknown, field: string, issues: ValidationIssue[]): string | undefined {
  const normalized = stringValue(value, field, issues, { allowEmpty: true, max: ADMIN_LIMITS.imageDataUrlChars });
  if (normalized === undefined || normalized === "") return normalized;

  if (/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/i.test(normalized)) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return parsed.toString();
  } catch {
    // handled below
  }

  issue(issues, field, "deve ser uma URL http(s) ou imagem data URL PNG/JPEG/WEBP válida");
  return undefined;
}

function colorValue(value: unknown, field: string, issues: ValidationIssue[]): string | undefined {
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    issue(issues, field, "deve usar o formato hexadecimal #RRGGBB");
    return undefined;
  }
  return value.trim().toUpperCase();
}

function phoneValue(value: unknown, field: string, issues: ValidationIssue[]): string | undefined {
  const normalized = stringValue(value, field, issues, { allowEmpty: true, max: 32 });
  if (normalized === undefined || normalized === "") return normalized;
  if (!isValidPhoneBR(normalized)) {
    issue(issues, field, "deve conter DDD e telefone brasileiro com 10 ou 11 dígitos");
    return undefined;
  }
  return formatPhoneBR(normalized);
}

function menuType(raw: Record<string, unknown>, issues: ValidationIssue[]): MenuItemType | undefined {
  const candidate = raw.itemType !== undefined
    ? raw.itemType
    : raw.type === "size" || raw.type === "flavor" || raw.type === "addon"
      ? raw.type
      : undefined;
  return enumValue(candidate, "itemType", ["size", "flavor", "addon"] as const, issues);
}

function flavorCategory(raw: Record<string, unknown>): unknown {
  if (raw.flavorType !== undefined) return raw.flavorType;
  if (raw.category !== undefined) return raw.category;
  if (raw.itemType !== undefined && raw.type !== undefined) return raw.type;
  return undefined;
}

function sizeData(raw: Record<string, unknown>, issues: ValidationIssue[], partial: boolean): Partial<SizeData> {
  const data: Partial<SizeData> = {};
  const take = (key: keyof SizeData) => !partial || raw[key] !== undefined;
  if (take("name")) data.name = stringValue(raw.name, "name", issues, { max: 80 });
  if (take("servings")) data.servings = stringValue(raw.servings, "servings", issues, { max: 80 });
  if (take("weightKg")) data.weightKg = numberValue(raw.weightKg, "weightKg", issues, { min: 0.1, max: ADMIN_LIMITS.weightKg });
  if (take("basePrice")) data.basePrice = numberValue(raw.basePrice, "basePrice", issues, { min: 0, max: ADMIN_LIMITS.money });
  if (take("maxFillings")) data.maxFillings = numberValue(raw.maxFillings, "maxFillings", issues, { min: 1, max: ADMIN_LIMITS.maxFillings, integer: true });
  if (take("sortOrder")) data.sortOrder = numberValue(defaultIfUndefined(raw.sortOrder, 0), "sortOrder", issues, { min: 0, max: ADMIN_LIMITS.sortOrder, integer: true });
  if (take("active")) data.active = booleanValue(defaultIfUndefined(raw.active, true), "active", issues);
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<SizeData>;
}

function flavorData(raw: Record<string, unknown>, issues: ValidationIssue[], partial: boolean): Partial<FlavorData> {
  const data: Partial<FlavorData> = {};
  const take = (key: keyof FlavorData) => !partial || raw[key] !== undefined || (key === "type" && (raw.flavorType !== undefined || raw.category !== undefined));
  if (take("name")) data.name = stringValue(raw.name, "name", issues, { max: 80 });
  if (take("type")) data.type = enumValue(flavorCategory(raw), "type", ["MASSA", "RECHEIO"] as const, issues);
  if (take("additionalPrice")) data.additionalPrice = numberValue(defaultIfUndefined(raw.additionalPrice, 0), "additionalPrice", issues, { min: 0, max: ADMIN_LIMITS.money });
  if (take("isSpecial")) data.isSpecial = booleanValue(defaultIfUndefined(raw.isSpecial, false), "isSpecial", issues);
  if (take("imageUrl")) data.imageUrl = imageValue(defaultIfUndefined(raw.imageUrl, ""), "imageUrl", issues);
  if (take("sortOrder")) data.sortOrder = numberValue(defaultIfUndefined(raw.sortOrder, 0), "sortOrder", issues, { min: 0, max: ADMIN_LIMITS.sortOrder, integer: true });
  if (take("active")) data.active = booleanValue(defaultIfUndefined(raw.active, true), "active", issues);
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<FlavorData>;
}

function addonData(raw: Record<string, unknown>, issues: ValidationIssue[], partial: boolean): Partial<AddonData> {
  const data: Partial<AddonData> = {};
  const take = (key: keyof AddonData) => !partial || raw[key] !== undefined;
  if (take("name")) data.name = stringValue(raw.name, "name", issues, { max: 80 });
  if (take("description")) data.description = stringValue(defaultIfUndefined(raw.description, ""), "description", issues, { allowEmpty: true, max: ADMIN_LIMITS.description });
  if (take("price")) data.price = numberValue(raw.price, "price", issues, { min: 0, max: ADMIN_LIMITS.money });
  if (take("imageUrl")) data.imageUrl = imageValue(defaultIfUndefined(raw.imageUrl, ""), "imageUrl", issues);
  if (take("sortOrder")) data.sortOrder = numberValue(defaultIfUndefined(raw.sortOrder, 0), "sortOrder", issues, { min: 0, max: ADMIN_LIMITS.sortOrder, integer: true });
  if (take("active")) data.active = booleanValue(defaultIfUndefined(raw.active, true), "active", issues);
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Partial<AddonData>;
}

export function validateMenuCreate(input: unknown): ValidationResult<MenuCreateInput> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: [{ field: "$", message: "corpo deve ser um objeto JSON" }] };
  const issues: ValidationIssue[] = [];
  const itemType = menuType(raw, issues);
  if (!itemType) return { ok: false, issues };

  if (itemType === "size") {
    const data = sizeData(raw, issues, false);
    return issues.length ? { ok: false, issues } : { ok: true, value: { itemType, data: data as SizeData } };
  }
  if (itemType === "flavor") {
    const data = flavorData(raw, issues, false);
    return issues.length ? { ok: false, issues } : { ok: true, value: { itemType, data: data as FlavorData } };
  }
  const data = addonData(raw, issues, false);
  return issues.length ? { ok: false, issues } : { ok: true, value: { itemType, data: data as AddonData } };
}

export function validateMenuUpdate(input: unknown): ValidationResult<MenuUpdateInput> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: [{ field: "$", message: "corpo deve ser um objeto JSON" }] };
  const issues: ValidationIssue[] = [];
  const id = stringValue(raw.id, "id", issues, { max: 100 });
  const itemType = menuType(raw, issues);
  if (!id || !itemType) return { ok: false, issues };

  const data = itemType === "size"
    ? sizeData(raw, issues, true)
    : itemType === "flavor"
      ? flavorData(raw, issues, true)
      : addonData(raw, issues, true);
  if (Object.keys(data).length === 0 && issues.length === 0) issue(issues, "$", "nenhum campo mutável informado");
  if (issues.length) return { ok: false, issues };
  return { ok: true, value: { id, itemType, data } as MenuUpdateInput };
}

export function validateFeaturesConfig(value: unknown): ValidationResult<FeaturesConfig> {
  const raw = record(value);
  if (!raw) return { ok: false, issues: [{ field: "featuresConfig", message: "deve ser um objeto" }] };
  const issues: ValidationIssue[] = [];
  const allowedKeys = new Set(["allow_photo_upload", "deposit_mode", "enable_delivery_step", "custom_fields"]);
  for (const key of Object.keys(raw)) {
    if (!allowedKeys.has(key)) issue(issues, `featuresConfig.${key}`, "campo não suportado");
  }

  const allowPhoto = booleanValue(raw.allow_photo_upload, "featuresConfig.allow_photo_upload", issues);
  const depositMode = enumValue(raw.deposit_mode, "featuresConfig.deposit_mode", ["50_percent", "100_percent", "quote_only"] as const, issues);
  const delivery = booleanValue(raw.enable_delivery_step, "featuresConfig.enable_delivery_step", issues);
  const customFields: CustomFieldDef[] = [];

  if (!Array.isArray(raw.custom_fields)) {
    issue(issues, "featuresConfig.custom_fields", "deve ser uma lista");
  } else if (raw.custom_fields.length > ADMIN_LIMITS.customFields) {
    issue(issues, "featuresConfig.custom_fields", `deve ter no máximo ${ADMIN_LIMITS.customFields} campos`);
  } else {
    raw.custom_fields.forEach((entry, index) => {
      const item = record(entry);
      const prefix = `featuresConfig.custom_fields.${index}`;
      if (!item) {
        issue(issues, prefix, "deve ser um objeto");
        return;
      }
      const allowedFieldKeys = new Set(["label", "type", "required", "options"]);
      for (const key of Object.keys(item)) {
        if (!allowedFieldKeys.has(key)) issue(issues, `${prefix}.${key}`, "campo não suportado");
      }
      const label = stringValue(item.label, `${prefix}.label`, issues, { max: 80 });
      const type = enumValue(item.type, `${prefix}.type`, ["text", "select", "number"] as const, issues);
      const required = booleanValue(item.required, `${prefix}.required`, issues);
      let options: string[] | undefined;
      if (item.options !== undefined) {
        if (!Array.isArray(item.options) || item.options.length > ADMIN_LIMITS.customFieldOptions) {
          issue(issues, `${prefix}.options`, `deve ser uma lista com no máximo ${ADMIN_LIMITS.customFieldOptions} opções`);
        } else {
          options = item.options.map((option, optionIndex) => stringValue(option, `${prefix}.options.${optionIndex}`, issues, { max: 80 }))
            .filter((option): option is string => option !== undefined);
        }
      }
      if (type === "select" && (!options || options.length === 0)) issue(issues, `${prefix}.options`, "select exige ao menos uma opção");
      if (label !== undefined && type !== undefined && required !== undefined) {
        customFields.push({ label, type, required, ...(options ? { options } : {}) });
      }
    });
  }

  if (issues.length || allowPhoto === undefined || depositMode === undefined || delivery === undefined) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      allow_photo_upload: allowPhoto,
      deposit_mode: depositMode,
      enable_delivery_step: delivery,
      custom_fields: customFields,
    },
  };
}

export function validateTenantSettingsUpdate(input: unknown): ValidationResult<TenantSettingsUpdate> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: [{ field: "$", message: "corpo deve ser um objeto JSON" }] };
  const issues: ValidationIssue[] = [];
  const data: TenantSettingsUpdate = {};

  const textFields = ["name"] as const;
  for (const key of textFields) if (raw[key] !== undefined) {
    const value = stringValue(raw[key], key, issues, { max: ADMIN_LIMITS.text });
    if (value !== undefined) data[key] = value;
  }
  for (const key of ["logoUrl", "bannerUrl"] as const) if (raw[key] !== undefined) {
    const value = imageValue(raw[key], key, issues);
    if (value !== undefined) data[key] = value;
  }
  if (raw.whatsapp !== undefined) {
    const value = phoneValue(raw.whatsapp, "whatsapp", issues);
    if (value !== undefined) data.whatsapp = value;
  }
  if (raw.pixKey !== undefined) {
    const value = stringValue(raw.pixKey, "pixKey", issues, { allowEmpty: true, max: 180 });
    if (value !== undefined) data.pixKey = value;
  }
  for (const key of ["primaryColor", "secondaryColor", "backgroundColor", "buttonColor", "shadowColor", "textColor"] as const) if (raw[key] !== undefined) {
    const value = colorValue(raw[key], key, issues);
    if (value !== undefined) data[key] = value;
  }
  if (raw.maxOrdersPerDay !== undefined) {
    const value = numberValue(raw.maxOrdersPerDay, "maxOrdersPerDay", issues, { min: 1, max: ADMIN_LIMITS.maxOrdersPerDay, integer: true });
    if (value !== undefined) data.maxOrdersPerDay = value;
  }
  if (raw.minLeadDays !== undefined) {
    const value = numberValue(raw.minLeadDays, "minLeadDays", issues, { min: 1, max: ADMIN_LIMITS.minLeadDays, integer: true });
    if (value !== undefined) data.minLeadDays = value;
  }
  if (raw.featuresConfig !== undefined) {
    const parsed = validateFeaturesConfig(raw.featuresConfig);
    if (parsed.ok) data.featuresConfig = JSON.stringify(parsed.value);
    else issues.push(...parsed.issues);
  }

  const allowed = new Set([
    "tenantId", "name", "logoUrl", "bannerUrl", "whatsapp", "pixKey",
    "primaryColor", "secondaryColor", "backgroundColor", "buttonColor", "shadowColor", "textColor",
    "maxOrdersPerDay", "minLeadDays", "featuresConfig",
  ]);
  for (const key of Object.keys(raw)) if (!allowed.has(key)) issue(issues, key, "campo não suportado");
  if (Object.keys(data).length === 0 && issues.length === 0) issue(issues, "$", "nenhum campo mutável informado");

  return issues.length ? { ok: false, issues } : { ok: true, value: data };
}

export function validateBlockedDate(input: unknown): ValidationResult<{ date: string; reason: string }> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: [{ field: "$", message: "corpo deve ser um objeto JSON" }] };
  const issues: ValidationIssue[] = [];
  const date = stringValue(raw.date, "date", issues, { max: 10 });
  const reason = raw.reason === undefined
    ? "Esgotado"
    : stringValue(raw.reason, "reason", issues, { max: 160 });

  if (date && !isCanonicalDate(date)) issue(issues, "date", "deve ser uma data de calendário válida no formato YYYY-MM-DD");
  return issues.length || !date || !reason
    ? { ok: false, issues }
    : { ok: true, value: { date, reason } };
}

export function validateWorkSchedule(input: unknown): ValidationResult<{ dayOfWeek: number; isOpen: boolean }> {
  const raw = record(input);
  if (!raw) return { ok: false, issues: [{ field: "$", message: "corpo deve ser um objeto JSON" }] };
  const issues: ValidationIssue[] = [];
  const dayOfWeek = numberValue(raw.dayOfWeek, "dayOfWeek", issues, { min: 0, max: 6, integer: true });
  const isOpen = booleanValue(raw.isOpen, "isOpen", issues);
  return issues.length || dayOfWeek === undefined || isOpen === undefined
    ? { ok: false, issues }
    : { ok: true, value: { dayOfWeek, isOpen } };
}

export function isCanonicalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}
