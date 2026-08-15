import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";
import { CUSTOM_FIELD_LIMITS } from "../../src/lib/custom-fields";

const authHeaders = (tenantId: string) => ({ cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken(tenantId)}` });

function orderData(overrides: Record<string, unknown> = {}) {
  return {
    tenantId: "ci-custom-a",
    customerName: "Custom Field Test",
    customerPhone: "(11) 99999-0001",
    eventDate: "2030-02-15",
    cakeSizeId: "ci-custom-size-a",
    flavorId: "ci-custom-dough-a",
    fillingIds: ["ci-custom-filling-a"],
    addonIds: [],
    customFieldAnswers: {
      "ci-custom-theme-a": "Jardim encantado",
      "ci-custom-style-a": "Moderno",
      "ci-custom-guests-a": "12",
    },
    ...overrides,
  };
}

test.describe("tenant custom fields", () => {
  test("public tenant contract exposes only owned canonical field definitions", async ({ request }) => {
    const tenantA = await request.get("/api/tenants/ci-custom-a");
    expect(tenantA.status()).toBe(200);
    const bodyA = await tenantA.json();
    expect(bodyA.customFields.map((field: { id: string }) => field.id)).toEqual([
      "ci-custom-guests-a",
      "ci-custom-style-a",
      "ci-custom-theme-a",
    ]);
    expect(bodyA.customFields.map((field: { id: string }) => field.id)).not.toContain("ci-custom-note-b");

    const tenantB = await request.get("/api/tenants/ci-custom-b");
    expect(tenantB.status()).toBe(200);
    const bodyB = await tenantB.json();
    expect(bodyB.customFields.map((field: { id: string }) => field.id)).toEqual(["ci-custom-note-b"]);
  });

  test("missing, forged, invalid and oversized answers are rejected before persistence", async ({ request }, testInfo) => {
    const before = await request.get("/api/admin/orders", { headers: authHeaders("ci-custom-a") });
    expect(before.status()).toBe(200);
    const beforeCount = (await before.json()).orders.length as number;

    const cases = [
      { name: "missing-required", answers: { "ci-custom-style-a": "Moderno" } },
      { name: "invalid-select", answers: { "ci-custom-theme-a": "Tema", "ci-custom-style-a": "Inexistente" } },
      { name: "invalid-number", answers: { "ci-custom-theme-a": "Tema", "ci-custom-style-a": "Clássico", "ci-custom-guests-a": "abc" } },
      { name: "cross-tenant", answers: { "ci-custom-theme-a": "Tema", "ci-custom-style-a": "Clássico", "ci-custom-note-b": "forged" } },
      { name: "oversized-text", answers: { "ci-custom-theme-a": "x".repeat(CUSTOM_FIELD_LIMITS.textAnswer + 1), "ci-custom-style-a": "Clássico" } },
    ];

    for (const item of cases) {
      const response = await request.post("/api/orders", {
        headers: { "Idempotency-Key": `custom-negative-${testInfo.project.name}-${item.name}` },
        data: orderData({ customFieldAnswers: item.answers }),
      });
      expect(response.status(), item.name).toBe(422);
      expect((await response.json()).code).toBe("INVALID_CUSTOM_FIELDS");
    }

    const after = await request.get("/api/admin/orders", { headers: authHeaders("ci-custom-a") });
    expect((await after.json()).orders.length).toBe(beforeCount);
  });

  test("valid answers are normalized and preserved in the historical order snapshot", async ({ request }, testInfo) => {
    const response = await request.post("/api/orders", {
      headers: { "Idempotency-Key": `custom-valid-${testInfo.project.name}` },
      data: orderData(),
    });
    expect(response.status()).toBe(201);
    const created = await response.json();
    expect(created.customFields).toEqual([
      { id: "ci-custom-guests-a", label: "Convidados extras", type: "number", value: "12" },
      { id: "ci-custom-style-a", label: "Estilo", type: "select", value: "Moderno" },
      { id: "ci-custom-theme-a", label: "Tema da festa", type: "text", value: "Jardim encantado" },
    ]);

    const orders = await request.get("/api/admin/orders", { headers: authHeaders("ci-custom-a") });
    expect(orders.status()).toBe(200);
    const order = (await orders.json()).orders.find((candidate: { id: string }) => candidate.id === created.order.id);
    const snapshot = JSON.parse(order.selectionSnapshot);
    expect(snapshot.version).toBe(2);
    expect(snapshot.customFields).toEqual(created.customFields);
  });

  test("admin CRUD is session-tenant scoped and rejects foreign IDs", async ({ request }, testInfo) => {
    const tenantAHeaders = authHeaders("ci-custom-a");
    const tenantBHeaders = authHeaders("ci-custom-b");
    const label = `Preferência ${testInfo.project.name}`;

    const create = await request.post("/api/admin/custom-fields", {
      headers: tenantAHeaders,
      data: { label, type: "select", required: false, options: ["A", "B"] },
    });
    expect(create.status()).toBe(201);
    const createdFields = (await create.json()).customFields as Array<{ id: string; label: string }>;
    const created = createdFields.find((field) => field.label === label);
    expect(created).toBeTruthy();

    const foreignUpdate = await request.put("/api/admin/custom-fields", {
      headers: tenantBHeaders,
      data: { id: created!.id, label: `${label} forged`, type: "text", required: false, options: [] },
    });
    expect(foreignUpdate.status()).toBe(404);

    const update = await request.put("/api/admin/custom-fields", {
      headers: tenantAHeaders,
      data: { id: created!.id, label: `${label} editada`, type: "text", required: true, options: [] },
    });
    expect(update.status()).toBe(200);
    const updated = (await update.json()).customFields.find((field: { id: string }) => field.id === created!.id);
    expect(updated).toMatchObject({ label: `${label} editada`, type: "text", required: true, options: [] });

    const foreignDelete = await request.delete(`/api/admin/custom-fields?id=${created!.id}`, { headers: tenantBHeaders });
    expect(foreignDelete.status()).toBe(404);

    const readA = await request.get("/api/admin/custom-fields", { headers: tenantAHeaders });
    expect((await readA.json()).customFields.map((field: { id: string }) => field.id)).toContain(created!.id);

    const cleanup = await request.delete(`/api/admin/custom-fields?id=${created!.id}`, { headers: tenantAHeaders });
    expect(cleanup.status()).toBe(200);
  });
});
