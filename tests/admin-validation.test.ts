import test from "node:test";
import assert from "node:assert/strict";
import {
  isCanonicalDate,
  validateBlockedDate,
  validateFeaturesConfig,
  validateMenuCreate,
  validateMenuUpdate,
  validateTenantSettingsUpdate,
  validateWorkSchedule,
} from "../src/lib/admin-validation";

function expectInvalid(result: { ok: boolean; issues?: Array<{ field: string; message: string }> }, field: string) {
  assert.equal(result.ok, false);
  assert.ok(result.issues?.some((entry) => entry.field === field), `expected validation issue for ${field}`);
}

test("catalog create accepts bounded canonical size data", () => {
  const result = validateMenuCreate({
    itemType: "size",
    name: " Médio ",
    servings: "20-25 pessoas",
    weightKg: 2.5,
    basePrice: 199.9,
    maxFillings: 2,
    sortOrder: 4,
    active: true,
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.itemType, "size");
    assert.equal(result.value.data.name, "Médio");
    assert.equal(result.value.data.basePrice, 199.9);
  }
});

test("catalog rejects malformed authoritative pricing and limits", () => {
  expectInvalid(validateMenuCreate({
    itemType: "size",
    name: " ",
    servings: "10 pessoas",
    weightKg: 0,
    basePrice: -1,
    maxFillings: 0,
    sortOrder: -1,
    active: "true",
  }), "name");

  expectInvalid(validateMenuCreate({
    itemType: "addon",
    name: "Topo",
    description: "",
    price: Number.POSITIVE_INFINITY,
    imageUrl: "javascript:alert(1)",
    sortOrder: 0,
    active: true,
  }), "price");
});

test("flavor category is constrained to the supported contract", () => {
  expectInvalid(validateMenuCreate({
    itemType: "flavor",
    name: "Inventado",
    type: "COBERTURA",
    additionalPrice: 0,
    isSpecial: false,
    imageUrl: "",
    sortOrder: 0,
    active: true,
  }), "type");

  const valid = validateMenuCreate({
    itemType: "flavor",
    name: "Baunilha",
    type: "MASSA",
    additionalPrice: 0,
    isSpecial: false,
    imageUrl: "https://example.com/bolo.png",
    sortOrder: 0,
    active: true,
  });
  assert.equal(valid.ok, true);
});

test("partial catalog updates reject empty and invalid mutations", () => {
  expectInvalid(validateMenuUpdate({ id: "size-a", itemType: "size" }), "$");
  expectInvalid(validateMenuUpdate({ id: "size-a", itemType: "size", basePrice: "NaN" }), "basePrice");
  expectInvalid(validateMenuUpdate({ id: "flavor-a", itemType: "flavor", category: "OTHER" }), "type");
});

test("explicit nulls are rejected instead of being coerced to defaults", () => {
  expectInvalid(validateMenuUpdate({ id: "size-a", itemType: "size", active: null }), "active");
  expectInvalid(validateMenuUpdate({ id: "size-a", itemType: "size", sortOrder: null }), "sortOrder");
  expectInvalid(validateMenuUpdate({ id: "flavor-a", itemType: "flavor", additionalPrice: null }), "additionalPrice");
  expectInvalid(validateMenuUpdate({ id: "addon-a", itemType: "addon", description: null }), "description");
  expectInvalid(validateMenuCreate({
    itemType: null,
    type: "addon",
    name: "Null type",
    price: 1,
  }), "itemType");
});

test("tenant settings normalize bounded values and phone", () => {
  const result = validateTenantSettingsUpdate({
    tenantId: "ignored-client-tenant",
    name: " Ateliê CI ",
    whatsapp: "(11) 98888-7777",
    primaryColor: "#8b5cf6",
    maxOrdersPerDay: 20,
    minLeadDays: 5,
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.name, "Ateliê CI");
    assert.equal(result.value.whatsapp, "(11) 98888-7777");
    assert.equal(result.value.primaryColor, "#8B5CF6");
    assert.equal(result.value.maxOrdersPerDay, 20);
  }
});

test("tenant settings reject unsafe capacity, colors, phones and unknown fields", () => {
  expectInvalid(validateTenantSettingsUpdate({ maxOrdersPerDay: 0 }), "maxOrdersPerDay");
  expectInvalid(validateTenantSettingsUpdate({ minLeadDays: 31 }), "minLeadDays");
  expectInvalid(validateTenantSettingsUpdate({ primaryColor: "red" }), "primaryColor");
  expectInvalid(validateTenantSettingsUpdate({ whatsapp: "123" }), "whatsapp");
  expectInvalid(validateTenantSettingsUpdate({ arbitraryBusinessRule: true }), "arbitraryBusinessRule");
});

test("features config accepts only the supported product shape", () => {
  const valid = validateFeaturesConfig({
    allow_photo_upload: true,
    deposit_mode: "quote_only",
    enable_delivery_step: false,
    custom_fields: [
      { label: "Tema", type: "select", required: true, options: ["A", "B"] },
      { label: "Convidados", type: "number", required: false },
    ],
  });
  assert.equal(valid.ok, true);

  expectInvalid(validateFeaturesConfig({
    allow_photo_upload: true,
    deposit_mode: "fixed",
    enable_delivery_step: false,
    custom_fields: [],
  }), "featuresConfig.deposit_mode");

  expectInvalid(validateFeaturesConfig({
    allow_photo_upload: true,
    deposit_mode: "50_percent",
    enable_delivery_step: false,
    custom_fields: [{ label: "Tema", type: "select", required: true, options: [] }],
  }), "featuresConfig.custom_fields.0.options");

  expectInvalid(validateFeaturesConfig({
    allow_photo_upload: true,
    deposit_mode: "50_percent",
    enable_delivery_step: false,
    custom_fields: [],
    experimental_flag: true,
  }), "featuresConfig.experimental_flag");
});

test("calendar accepts only real canonical dates", () => {
  assert.equal(isCanonicalDate("2028-02-29"), true);
  assert.equal(isCanonicalDate("2026-02-29"), false);
  assert.equal(isCanonicalDate("2026-13-01"), false);
  assert.equal(isCanonicalDate("2026-2-01"), false);

  assert.equal(validateBlockedDate({ date: "2028-02-29", reason: "Feriado" }).ok, true);
  expectInvalid(validateBlockedDate({ date: "2026-02-30" }), "date");
});

test("work schedule requires a real weekday and boolean state", () => {
  assert.equal(validateWorkSchedule({ dayOfWeek: 0, isOpen: false }).ok, true);
  assert.equal(validateWorkSchedule({ dayOfWeek: 6, isOpen: true }).ok, true);
  expectInvalid(validateWorkSchedule({ dayOfWeek: 7, isOpen: true }), "dayOfWeek");
  expectInvalid(validateWorkSchedule({ dayOfWeek: 1, isOpen: 1 }), "isOpen");
});
