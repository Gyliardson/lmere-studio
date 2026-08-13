import { expect, test } from "@playwright/test";

const base = {
  tenantId: "ci-tenant-a",
  customerPhone: "5511999999999",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

test("concurrent submissions cannot exceed daily capacity", async ({ request }, testInfo) => {
  const eventDate = testInfo.project.name.includes("mobile") ? "2030-02-11" : "2030-02-04";

  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, index) => request.post("/api/orders", {
      headers: { "Idempotency-Key": `capacity-race-${testInfo.project.name}-${index}` },
      data: { ...base, eventDate, customerName: `Capacity race ${index}` },
    })),
  );

  const statuses = responses.map((response) => response.status()).sort((a, b) => a - b);
  expect(statuses).toEqual([201, 201, 201, 201, 201, 409]);

  const rejected = responses.find((response) => response.status() === 409);
  expect(rejected).toBeTruthy();
  expect((await rejected!.json()).code).toBe("DAILY_CAPACITY_REACHED");
});
