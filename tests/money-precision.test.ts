import test from "node:test";
import assert from "node:assert/strict";
import { validateMenuCreate, validateMenuUpdate } from "../src/lib/admin-validation";

function expectInvalid(result: { ok: boolean; issues?: Array<{ field: string; message: string }> }, field: string) {
  assert.equal(result.ok, false);
  assert.ok(result.issues?.some((entry) => entry.field === field), `expected validation issue for ${field}`);
}

test("catalog money accepts values aligned to whole cents", () => {
  const size = validateMenuCreate({
    itemType: "size",
    name: "Cent size",
    servings: "10 pessoas",
    weightKg: 1,
    basePrice: 12.34,
    maxFillings: 2,
    sortOrder: 0,
    active: true,
  });
  assert.equal(size.ok, true);
  if (size.ok && size.value.itemType === "size") {
    assert.equal(size.value.data.basePrice, 12.34);
  }

  const flavor = validateMenuCreate({
    itemType: "flavor",
    name: "Cent flavor",
    type: "MASSA",
    additionalPrice: 0.01,
    isSpecial: false,
    imageUrl: "",
    sortOrder: 0,
    active: true,
  });
  assert.equal(flavor.ok, true);

  const addon = validateMenuCreate({
    itemType: "addon",
    name: "Cent addon",
    description: "",
    price: 1_000_000,
    imageUrl: "",
    sortOrder: 0,
    active: true,
  });
  assert.equal(addon.ok, true);
});

test("catalog money rejects sub-cent authoritative values", () => {
  expectInvalid(validateMenuUpdate({ id: "size-a", itemType: "size", basePrice: 12.345 }), "basePrice");
  expectInvalid(validateMenuUpdate({ id: "flavor-a", itemType: "flavor", additionalPrice: 0.001 }), "additionalPrice");
  expectInvalid(validateMenuUpdate({ id: "addon-a", itemType: "addon", price: 99.999 }), "price");
});

test("cent precision handles common binary floating-point values without false rejection", () => {
  for (const value of [0, 0.1, 0.29, 1.99, 199.9, 999_999.99]) {
    const result = validateMenuUpdate({ id: "size-a", itemType: "size", basePrice: value });
    assert.equal(result.ok, true, `expected ${value} to be accepted`);
  }
});
