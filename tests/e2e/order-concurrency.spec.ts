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
  const projectOffset = testInfo.project.name.includes("mobile") ? 7 : 0;
  const retryOffset = testInfo.retry * 14;
  const day = 4 + projectOffset + retryOffset;
  const eventDate = `2030-02-${String(day).padStart(2, "0")}`;
  const attemptKey = `${testInfo.project.name}-${testInfo.retry}`;

  const responses = await Promise.all(
    Array.from({ length: 6 }, (_, index) => request.post("/api/orders", {
      headers: { "Idempotency-Key": `capacity-race-${attemptKey}-${index}` },
      data: { ...base, eventDate, customerName: `Capacity race ${attemptKey} ${index}` },
    })),
  );

  const statuses = responses.map((response) => response.status()).sort((a, b) => a - b);
  expect(statuses).toEqual([201, 201, 201, 201, 201, 409]);

  const rejected = responses.find((response) => response.status() === 409);
  expect(rejected).toBeTruthy();
  expect((await rejected!.json()).code).toBe("DAILY_CAPACITY_REACHED");
});
