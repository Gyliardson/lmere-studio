import { expect, test } from "@playwright/test";

const validBaseOrder = {
  tenantId: "ci-tenant-a",
  customerName: "Order Authority Test",
  customerPhone: "5511999999999",
  eventDate: "2026-11-16",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

test("public order ignores manipulated client pricing", async ({ request }) => {
  const response = await request.post("/api/orders", {
    data: { ...validBaseOrder, subtotal: 0.01, depositAmount: 0.01, depositMode: "quote_only" },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.order.subtotal).toBe(110);
  expect(body.order.depositAmount).toBe(55);
  expect(body.order.depositMode).toBe("50_percent");
});

test("public order rejects a cross-tenant catalog selection", async ({ request }) => {
  const response = await request.post("/api/orders", {
    data: { ...validBaseOrder, cakeSizeId: "ci-size-b", subtotal: 80, depositAmount: 40 },
  });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe("INVALID_CAKE_SIZE");
});
