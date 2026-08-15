import { expect, test, type APIRequestContext } from "@playwright/test";

const base = {
  tenantId: "ci-tenant-a",
  customerName: "Catalog Rules",
  customerPhone: "5511999999999",
  eventDate: "2030-01-07",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

async function expectRejected(request: APIRequestContext, patch: Record<string, unknown>, code: string) {
  const response = await request.post("/api/orders", { data: { ...base, ...patch } });
  expect(response.status()).toBe(400);
  expect((await response.json()).code).toBe(code);
}

test("rejects foreign, inactive and unknown catalog selections", async ({ request }) => {
  await expectRejected(request, { cakeSizeId: "ci-size-b" }, "INVALID_CAKE_SIZE");
  await expectRejected(request, { cakeSizeId: "ci-size-a-inactive" }, "INVALID_CAKE_SIZE");
  await expectRejected(request, { flavorId: "missing-flavor" }, "INVALID_DOUGH");
  await expectRejected(request, { fillingIds: ["ci-filling-b"] }, "INVALID_FILLING");
  await expectRejected(request, { addonIds: ["ci-addon-b"] }, "INVALID_ADDON");
});

test("rejects selections above the size filling limit", async ({ request }) => {
  await expectRejected(
    request,
    { fillingIds: ["ci-filling-a", "ci-filling-a-2", "ci-filling-a-3"] },
    "TOO_MANY_FILLINGS",
  );
});
