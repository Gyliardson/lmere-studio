import { expect, test } from "@playwright/test";

test("uses tenant deposit configuration instead of client values", async ({ request }) => {
  const response = await request.post("/api/orders", {
    data: {
      tenantId: "ci-tenant-b",
      customerName: "Deposit Authority",
      customerPhone: "5511999999999",
      eventDate: "2030-02-04",
      cakeSizeId: "ci-size-b",
      flavorId: "ci-flavor-b",
      fillingIds: ["ci-filling-b"],
      addonIds: [],
      subtotal: 1,
      depositAmount: 1,
      depositMode: "quote_only",
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.order.subtotal).toBe(85);
  expect(body.order.depositAmount).toBe(85);
  expect(body.order.depositMode).toBe("100_percent");
});
