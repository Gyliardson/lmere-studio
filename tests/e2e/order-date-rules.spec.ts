import { expect, test } from "@playwright/test";

const base = {
  tenantId: "ci-tenant-a",
  customerName: "Date Rules",
  customerPhone: "5511999999999",
  eventDate: "2030-01-07",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

function tomorrowUtc() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

test("order creation enforces lead time", async ({ request }) => {
  const response = await request.post("/api/orders", { data: { ...base, eventDate: tomorrowUtc() } });
  expect(response.status()).toBe(409);
  expect((await response.json()).code).toBe("LEAD_TIME_UNAVAILABLE");
});

test("order creation rejects blocked and closed dates", async ({ request }) => {
  const blocked = await request.post("/api/orders", { data: { ...base, eventDate: "2030-01-09" } });
  expect(blocked.status()).toBe(409);
  expect((await blocked.json()).code).toBe("DATE_BLOCKED");

  const closed = await request.post("/api/orders", { data: { ...base, eventDate: "2030-01-08" } });
  expect(closed.status()).toBe(409);
  expect((await closed.json()).code).toBe("CLOSED_WEEKDAY");
});
