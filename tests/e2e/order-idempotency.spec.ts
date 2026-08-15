import { expect, test } from "@playwright/test";

const baseOrder = {
  tenantId: "ci-tenant-a",
  customerName: "Idempotency Test",
  customerPhone: "5511999999999",
  eventDate: "2026-12-02",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: ["ci-addon-a"],
};

test("replays the same order instead of persisting a duplicate", async ({ request }) => {
  const idempotencyKey = `pw-idempotency-${test.info().project.name}-retry-${test.info().retry}`;

  const first = await request.post("/api/orders", {
    headers: { "Idempotency-Key": idempotencyKey },
    data: { ...baseOrder, subtotal: 0.01, depositAmount: 0.01 },
  });
  expect(first.status()).toBe(201);
  const firstBody = await first.json();
  expect(firstBody.idempotentReplay).toBe(false);
  expect(firstBody.order.idempotencyKey).toBe(idempotencyKey);
  expect(firstBody.order.subtotal).toBe(125);
  expect(firstBody.order.depositAmount).toBe(62.5);

  const snapshot = JSON.parse(firstBody.order.selectionSnapshot);
  expect(snapshot).toMatchObject({
    version: 2,
    size: { id: "ci-size-a", name: "CI Size A", basePrice: 100 },
    dough: { id: "ci-flavor-a", name: "CI Flavor A", additionalPrice: 0 },
    pricing: { subtotal: 125, depositAmount: 62.5, depositMode: "50_percent" },
    customFields: [],
  });
  expect(snapshot.fillings).toEqual([
    { id: "ci-filling-a", name: "CI Filling A", additionalPrice: 10 },
  ]);
  expect(snapshot.addons).toEqual([
    { id: "ci-addon-a", name: "CI Addon A", price: 15 },
  ]);

  const replay = await request.post("/api/orders", {
    headers: { "Idempotency-Key": idempotencyKey },
    data: { ...baseOrder, subtotal: 999999, depositAmount: 999999 },
  });
  expect(replay.status()).toBe(200);
  const replayBody = await replay.json();
  expect(replayBody.idempotentReplay).toBe(true);
  expect(replayBody.order.id).toBe(firstBody.order.id);
  expect(replayBody.order.subtotal).toBe(125);
  expect(replayBody.order.depositAmount).toBe(62.5);
});

test("rejects malformed idempotency keys", async ({ request }) => {
  const response = await request.post("/api/orders", {
    headers: { "Idempotency-Key": "x".repeat(129) },
    data: baseOrder,
  });

  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe("INVALID_IDEMPOTENCY_KEY");
});
