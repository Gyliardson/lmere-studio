import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

function authHeaders(tenantId: string) {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken(tenantId)}` };
}

async function expectValidation(response: Awaited<ReturnType<Parameters<typeof test>[0]>> | never) {
  void response;
}

test.describe("authoritative admin mutation invariants", () => {
  test("catalog rejects invalid values without corrupting persisted items", async ({ request }) => {
    const headers = authHeaders("ci-tenant-a");

    const negativePrice = await request.put("/api/admin/menu", {
      headers,
      data: { id: "ci-size-a", itemType: "size", basePrice: -0.01 },
    });
    expect(negativePrice.status()).toBe(422);
    expect((await negativePrice.json()).code).toBe("VALIDATION_ERROR");

    const impossibleFillings = await request.put("/api/admin/menu", {
      headers,
      data: { id: "ci-size-a", itemType: "size", maxFillings: 11 },
    });
    expect(impossibleFillings.status()).toBe(422);

    const invalidFlavor = await request.post("/api/admin/menu", {
      headers,
      data: {
        itemType: "flavor",
        name: "Invalid CI Flavor",
        type: "COBERTURA",
        additionalPrice: 0,
        isSpecial: false,
        imageUrl: "",
        sortOrder: 100,
        active: true,
      },
    });
    expect(invalidFlavor.status()).toBe(422);

    const unsafeImage = await request.post("/api/admin/menu", {
      headers,
      data: {
        itemType: "addon",
        name: "Unsafe image",
        description: "must not persist",
        price: 10,
        imageUrl: "javascript:alert(1)",
        sortOrder: 100,
        active: true,
      },
    });
    expect(unsafeImage.status()).toBe(422);

    const after = await request.get("/api/admin/menu", { headers });
    expect(after.status()).toBe(200);
    const body = await after.json();
    const size = body.sizes.find((item: { id: string }) => item.id === "ci-size-a");
    expect(size.basePrice).toBe(100);
    expect(size.maxFillings).toBe(2);
    expect(body.flavors.some((item: { name: string }) => item.name === "Invalid CI Flavor")).toBe(false);
    expect(body.addons.some((item: { name: string }) => item.name === "Unsafe image")).toBe(false);
  });

  test("settings reject invalid authoritative business configuration atomically", async ({ request }) => {
    const headers = authHeaders("ci-tenant-a");

    for (const data of [
      { maxOrdersPerDay: 0 },
      { maxOrdersPerDay: 51 },
      { minLeadDays: 0 },
      { minLeadDays: 31 },
      { primaryColor: "red" },
      { whatsapp: "123" },
      {
        featuresConfig: {
          allow_photo_upload: true,
          deposit_mode: "fixed",
          enable_delivery_step: false,
          custom_fields: [],
        },
      },
      { arbitraryBusinessRule: true },
    ]) {
      const response = await request.put("/api/admin/settings", { headers, data });
      expect(response.status()).toBe(422);
      expect((await response.json()).code).toBe("VALIDATION_ERROR");
    }

    const after = await request.get("/api/admin/settings", { headers });
    expect(after.status()).toBe(200);
    const settings = (await after.json()).settings;
    expect(settings.maxOrdersPerDay).toBe(5);
    expect(settings.minLeadDays).toBe(3);
    expect(settings.primaryColor).toBe("#8B5CF6");
    expect(settings.featuresConfig.deposit_mode).toBe("50_percent");
  });

  test("calendar rejects impossible dates and invalid weekly schedules", async ({ request }) => {
    const headers = authHeaders("ci-tenant-a");

    for (const date of ["2026-02-30", "2026-13-01", "2026-2-01", "not-a-date"]) {
      const response = await request.post("/api/admin/calendar", {
        headers,
        data: { date, reason: "must not persist" },
      });
      expect(response.status()).toBe(422);
      expect((await response.json()).code).toBe("VALIDATION_ERROR");
    }

    const badDay = await request.put("/api/admin/calendar", {
      headers,
      data: { dayOfWeek: 7, isOpen: true },
    });
    expect(badDay.status()).toBe(422);

    const badBoolean = await request.put("/api/admin/calendar", {
      headers,
      data: { dayOfWeek: 1, isOpen: "false" },
    });
    expect(badBoolean.status()).toBe(422);

    const after = await request.get("/api/admin/calendar", { headers });
    expect(after.status()).toBe(200);
    const calendar = await after.json();
    expect(calendar.blockedDates.some((item: { reason: string }) => item.reason === "must not persist")).toBe(false);
    expect(calendar.workSchedule.find((item: { dayOfWeek: number }) => item.dayOfWeek === 1).isOpen).toBe(true);
  });

  test("valid bounded mutations continue to work without trusting client tenantId", async ({ request }, testInfo) => {
    const headers = authHeaders("ci-tenant-a");
    const suffix = testInfo.project.name.includes("mobile") ? "m" : "d";
    const name = `CI Valid Addon ${suffix}`;

    const create = await request.post("/api/admin/menu", {
      headers,
      data: {
        tenantId: "ci-tenant-b",
        itemType: "addon",
        name,
        description: "bounded invariant fixture",
        price: 12.5,
        imageUrl: "https://example.com/addon.png",
        sortOrder: 90,
        active: true,
      },
    });
    expect(create.status()).toBe(201);
    const item = (await create.json()).item as { id: string; tenantId: string; name: string; price: number };
    expect(item.tenantId).toBe("ci-tenant-a");
    expect(item.name).toBe(name);
    expect(item.price).toBe(12.5);

    const validDate = testInfo.project.name.includes("mobile") ? "2029-08-22" : "2029-08-21";
    const blocked = await request.post("/api/admin/calendar", {
      headers,
      data: { tenantId: "ci-tenant-b", date: validDate, reason: `CI valid ${suffix}` },
    });
    expect(blocked.status()).toBe(201);
    const blockedId = (await blocked.json()).blocked.id as string;

    const validSettings = await request.put("/api/admin/settings", {
      headers,
      data: {
        tenantId: "ci-tenant-b",
        maxOrdersPerDay: 6,
        minLeadDays: 4,
        featuresConfig: {
          allow_photo_upload: true,
          deposit_mode: "quote_only",
          enable_delivery_step: false,
          custom_fields: [],
        },
      },
    });
    expect(validSettings.status()).toBe(200);
    expect((await validSettings.json()).settings.id).toBe("ci-tenant-a");

    // Restore deterministic shared fixtures before this spec completes.
    const restoreSettings = await request.put("/api/admin/settings", {
      headers,
      data: {
        maxOrdersPerDay: 5,
        minLeadDays: 3,
        featuresConfig: {
          allow_photo_upload: true,
          deposit_mode: "50_percent",
          enable_delivery_step: false,
          custom_fields: [],
        },
      },
    });
    expect(restoreSettings.status()).toBe(200);

    expect((await request.delete(`/api/admin/calendar?id=${blockedId}`, { headers })).status()).toBe(200);
    expect((await request.delete(`/api/admin/menu?id=${item.id}&type=addon`, { headers })).status()).toBe(200);
  });
});
