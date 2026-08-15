import { expect, test, type APIRequestContext } from "@playwright/test";

const baseOrder = {
  tenantId: "ci-tenant-a",
  customerName: "Text Limit Test",
  customerPhone: "5511999999999",
  eventDate: "2026-12-21",
  cakeSizeId: "ci-size-a",
  flavorId: "ci-flavor-a",
  fillingIds: ["ci-filling-a"],
  addonIds: [],
};

async function adminToken(request: APIRequestContext) {
  const login = await request.post("/api/admin/auth", {
    data: { slug: "ci-tenant-a", password: "ci-admin-password" },
  });
  expect(login.status()).toBe(200);
  const token = (login.headers()["set-cookie"] ?? "").match(/lmere_admin_session=([^;]+)/)?.[1];
  expect(token).toBeTruthy();
  return token!;
}

async function orderCount(request: APIRequestContext, customerName: string) {
  const token = await adminToken(request);
  const response = await request.get("/api/admin/orders", {
    headers: { cookie: `lmere_admin_session=${token}` },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.orders.filter((order: { customerName: string }) => order.customerName === customerName).length;
}

for (const field of [
  { key: "customerName", limit: 120, code: "CUSTOMER_NAME_TOO_LONG" },
  { key: "cakeMessage", limit: 200, code: "CAKE_MESSAGE_TOO_LONG" },
  { key: "details", limit: 2000, code: "ORDER_DETAILS_TOO_LONG" },
] as const) {
  test(`public order rejects ${field.key} above the server-owned limit without persistence`, async ({ request }) => {
    const marker = `Reject-${field.key}-${test.info().project.name}`;
    const customerName = field.key === "customerName" ? "x".repeat(field.limit + 1) : marker;
    const before = field.key === "customerName" ? null : await orderCount(request, customerName);
    const response = await request.post("/api/orders", {
      data: {
        ...baseOrder,
        customerName,
        [field.key]: "x".repeat(field.limit + 1),
      },
    });
    expect(response.status()).toBe(422);
    expect((await response.json()).code).toBe(field.code);
    if (before !== null) expect(await orderCount(request, customerName)).toBe(before);
  });
}

test("public order accepts long content exactly at the server-owned boundaries", async ({ request }) => {
  const response = await request.post("/api/orders", {
    data: {
      ...baseOrder,
      eventDate: "2026-12-28",
      customerName: "N".repeat(120),
      cakeMessage: "M".repeat(200),
      details: "D".repeat(2000),
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.order.customerName).toHaveLength(120);
  expect(body.order.cakeMessage).toHaveLength(200);
  expect(body.order.details).toHaveLength(2000);
});
