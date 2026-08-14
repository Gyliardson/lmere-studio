import { expect, test } from "@playwright/test";

const base = {
  tenantId: "ci-tenant-a",
  customerPhone: "5511999999999",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

test("rejects orders above tenant daily capacity", async ({ request }, testInfo) => {
  const eventDate = testInfo.project.name.includes("mobile") ? "2030-01-21" : "2030-01-14";
  for (let index = 0; index < 5; index += 1) {
    const response = await request.post("/api/orders", {
      data: { ...base, eventDate, customerName: `Capacity ${testInfo.project.name} ${index}` },
    });
    expect(response.status()).toBe(201);
  }

  const overflow = await request.post("/api/orders", {
    data: { ...base, eventDate, customerName: `Capacity overflow ${testInfo.project.name}` },
  });
  expect(overflow.status()).toBe(409);
  expect((await overflow.json()).code).toBe("DAILY_CAPACITY_REACHED");
});
