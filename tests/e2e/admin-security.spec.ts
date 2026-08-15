import { expect, test } from "@playwright/test";

const protectedReads = [
  "/api/admin/auth",
  "/api/admin/orders?tenantId=ci-tenant-a",
  "/api/admin/menu?tenantId=ci-tenant-a",
  "/api/admin/calendar?tenantId=ci-tenant-a",
  "/api/admin/settings?tenantId=ci-tenant-a",
];

test.describe("admin security boundaries", () => {
  for (const path of protectedReads) {
    test(`rejects unauthenticated GET ${path.split("?")[0]}`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(401);
      await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
    });
  }

  test("rejects unauthenticated admin mutations even with tenant-controlled input", async ({ request }) => {
    const menuCreate = await request.post("/api/admin/menu", {
      data: { tenantId: "ci-tenant-b", itemType: "addon", name: "Injected", price: 1 },
    });
    expect(menuCreate.status()).toBe(401);

    const calendarUpdate = await request.put("/api/admin/calendar", {
      data: { tenantId: "ci-tenant-b", dayOfWeek: 1, isOpen: false },
    });
    expect(calendarUpdate.status()).toBe(401);

    const settingsUpdate = await request.put("/api/admin/settings", {
      data: { tenantId: "ci-tenant-b", name: "Injected" },
    });
    expect(settingsUpdate.status()).toBe(401);
  });

  test("admin document blocks automatic external image requests", async ({ request }) => {
    const adminResponse = await request.get("/admin");
    expect(adminResponse.status()).toBe(200);
    expect(adminResponse.headers()["content-security-policy"]).toBe("img-src 'self' data:;");

    const storefrontResponse = await request.get("/ci-tenant-a");
    expect(storefrontResponse.status()).toBe(200);
    expect(storefrontResponse.headers()["content-security-policy"]).toBeUndefined();
  });
});
