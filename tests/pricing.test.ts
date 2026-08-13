import test from "node:test";
import assert from "node:assert/strict";

import { calculateDeposit, calculateOrderTotal, formatCurrency } from "../src/lib/pricing";
import type { AddonData, CakeFlavorData, CakeSizeData } from "../src/lib/types";

const size: CakeSizeData = {
  id: "size",
  name: "Size",
  servings: "10 pessoas",
  weightKg: 1.5,
  basePrice: 100.1,
  maxFillings: 2,
  sortOrder: 0,
  active: true,
};

const dough: CakeFlavorData = {
  id: "dough",
  name: "Dough",
  type: "MASSA",
  additionalPrice: 4.25,
  isSpecial: false,
  imageUrl: "",
  active: true,
  sortOrder: 0,
};

const filling: CakeFlavorData = {
  id: "filling",
  name: "Filling",
  type: "RECHEIO",
  additionalPrice: 10.335,
  isSpecial: false,
  imageUrl: "",
  active: true,
  sortOrder: 0,
};

const addon: AddonData = {
  id: "addon",
  name: "Addon",
  description: "",
  price: 5.335,
  imageUrl: "",
  active: true,
  sortOrder: 0,
};

test("calculateOrderTotal returns zero without a selected size", () => {
  assert.equal(calculateOrderTotal(null, dough, [filling], [addon]), 0);
});

test("calculateOrderTotal adds current selections and rounds only at the final cent", () => {
  assert.equal(calculateOrderTotal(size, dough, [filling], [addon]), 120.02);
});

test("calculateOrderTotal ignores non-positive dough surcharge but preserves other charges", () => {
  assert.equal(
    calculateOrderTotal(size, { ...dough, additionalPrice: -99 }, [filling], []),
    110.44,
  );
});

test("calculateDeposit applies every supported mode deterministically", () => {
  assert.equal(calculateDeposit(120.03, "50_percent"), 60.02);
  assert.equal(calculateDeposit(120.03, "100_percent"), 120.03);
  assert.equal(calculateDeposit(120.03, "quote_only"), 0);
});

test("formatCurrency uses BRL formatting", () => {
  const formatted = formatCurrency(1234.56);
  assert.match(formatted, /1\.234,56/);
  assert.match(formatted, /R\$/);
});
