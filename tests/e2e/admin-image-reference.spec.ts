import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";
import { IMAGE_REFERENCE_LIMITS } from "../../src/lib/image-reference";

function authHeaders() {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken("ci-tenant-a")}` };
}

function oversizedPngDataUrl() {
  return `data:image/png;base64,${Buffer.alloc(IMAGE_REFERENCE_LIMITS.maxBytes + 1, 0x41).toString("base64")}`;
}

test.describe("bounded admin image references", () => {
  test("branding rejects insecure, credential-bearing and oversized images without mutation", async ({ request }) => {
    const headers = authHeaders();
    const before = await request.get("/api/admin/settings", { headers });
    expect(before.status()).toBe(200);
    const original = (await before.json()).settings as { logoUrl: string; bannerUrl: string };

    for (const data of [
      { logoUrl: "http://example.com/logo.png" },
      { bannerUrl: "https://user:secret@example.com/banner.webp" },
      { logoUrl: oversizedPngDataUrl() },
    ]) {
      const response = await request.put("/api/admin/settings", { headers, data });
      expect(response.status()).toBe(422);
      expect((await response.json()).code).toBe("VALIDATION_ERROR");
    }

    const after = await request.get("/api/admin/settings", { headers });
    expect(after.status()).toBe(200);
    const settings = (await after.json()).settings;
    expect(settings.logoUrl).toBe(original.logoUrl);
    expect(settings.bannerUrl).toBe(original.bannerUrl);
  });

  test("catalog rejects insecure image URL before persistence", async ({ request }, testInfo) => {
    const headers = authHeaders();
    const name = `Rejected image addon ${testInfo.project.name}`;
    const response = await request.post("/api/admin/menu", {
      headers,
      data: {
        itemType: "addon",
        name,
        description: "must not persist",
        price: 10,
        imageUrl: "http://example.com/addon.png",
        sortOrder: 101,
        active: true,
      },
    });

    expect(response.status()).toBe(422);
    expect((await response.json()).code).toBe("VALIDATION_ERROR");

    const after = await request.get("/api/admin/menu", { headers });
    expect(after.status()).toBe(200);
    const menu = await after.json();
    expect(menu.addons.some((item: { name: string }) => item.name === name)).toBe(false);
  });
});
