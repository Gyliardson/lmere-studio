import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

function authHeaders(tenantId: string) {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken(tenantId)}` };
}

test.describe("authenticated admin tenant isolation", () => {
  test("reads are scoped to the signed session tenant", async ({ request }) => {
    const tenantAHeaders = authHeaders("ci-tenant-a");
    const tenantBHeaders = authHeaders("ci-tenant-b");

    const menuA = await request.get("/api/admin/menu?tenantId=ci-tenant-b", { headers: tenantAHeaders });
    expect(menuA.status()).toBe(200);
    const menuABody = await menuA.json();
    expect(menuABody.sizes.map((item: { id: string }) => item.id)).toContain("ci-size-a");
    expect(menuABody.sizes.map((item: { id: string }) => item.id)).not.toContain("ci-size-b");

    const menuB = await request.get("/api/admin/menu?tenantId=ci-tenant-a", { headers: tenantBHeaders });
    expect(menuB.status()).toBe(200);
    const menuBBody = await menuB.json();
    expect(menuBBody.sizes.map((item: { id: string }) => item.id)).toContain("ci-size-b");
    expect(menuBBody.sizes.map((item: { id: string }) => item.id)).not.toContain("ci-size-a");

    const settingsA = await request.get("/api/admin/settings?tenantId=ci-tenant-b", { headers: tenantAHeaders });
    expect(settingsA.status()).toBe(200);
    expect((await settingsA.json()).settings.id).toBe("ci-tenant-a");

    const settingsB = await request.get("/api/admin/settings?tenantId=ci-tenant-a", { headers: tenantBHeaders });
    expect(settingsB.status()).toBe(200);
    expect((await settingsB.json()).settings.id).toBe("ci-tenant-b");
  });

  test("Tenant A cannot mutate Tenant B resources", async ({ request }, testInfo) => {
    const tenantAHeaders = authHeaders("ci-tenant-a");
    const tenantBHeaders = authHeaders("ci-tenant-b");

    const foreignMenuUpdate = await request.put("/api/admin/menu", {
      headers: tenantAHeaders,
      data: { id: "ci-size-b", itemType: "size", name: "Compromised B" },
    });
    expect(foreignMenuUpdate.status()).toBe(404);

    const menuB = await request.get("/api/admin/menu", { headers: tenantBHeaders });
    const sizeB = (await menuB.json()).sizes.find((item: { id: string }) => item.id === "ci-size-b");
    expect(sizeB.name).toBe("CI Size B");

    const daySuffix = testInfo.project.name.includes("mobile") ? "02" : "01";
    const blockedDate = `2026-10-${daySuffix}`;
    const createBlockedB = await request.post("/api/admin/calendar", {
      headers: tenantBHeaders,
      data: { tenantId: "ci-tenant-a", date: blockedDate, reason: "Tenant B owned" },
    });
    expect(createBlockedB.status()).toBe(201);
    const blockedBId = (await createBlockedB.json()).blocked.id as string;

    const deleteForeignBlocked = await request.delete(`/api/admin/calendar?id=${blockedBId}`, { headers: tenantAHeaders });
    expect(deleteForeignBlocked.status()).toBe(404);

    const calendarB = await request.get("/api/admin/calendar", { headers: tenantBHeaders });
    expect((await calendarB.json()).blockedDates.map((item: { id: string }) => item.id)).toContain(blockedBId);

    const settingsAttack = await request.put("/api/admin/settings", {
      headers: tenantAHeaders,
      data: { tenantId: "ci-tenant-b", name: "CI Tenant A Scoped" },
    });
    expect(settingsAttack.status()).toBe(200);
    expect((await settingsAttack.json()).settings.id).toBe("ci-tenant-a");

    const settingsBAfter = await request.get("/api/admin/settings", { headers: tenantBHeaders });
    expect((await settingsBAfter.json()).settings.name).toBe("CI Tenant B");

    const createOrderB = await request.post("/api/orders", {
      data: {
        tenantId: "ci-tenant-b",
        customerName: `Tenant B ${testInfo.project.name}`,
        customerPhone: "551100000002",
        eventDate: "2026-11-15",
        cakeSizeId: "ci-size-b",
        flavorId: "ci-flavor-b",
        fillingIds: ["ci-filling-b"],
        addonIds: [],
        subtotal: 80,
        depositAmount: 20,
        depositMode: "fixed",
      },
    });
    expect(createOrderB.status()).toBe(201);
    const orderBId = (await createOrderB.json()).order.id as string;

    const foreignOrderUpdate = await request.put("/api/admin/orders", {
      headers: tenantAHeaders,
      data: { orderId: orderBId, status: "confirmed" },
    });
    expect(foreignOrderUpdate.status()).toBe(404);

    const ordersB = await request.get("/api/admin/orders", { headers: tenantBHeaders });
    const orderB = (await ordersB.json()).orders.find((item: { id: string }) => item.id === orderBId);
    expect(orderB.status).toBe("pending");
  });
});
