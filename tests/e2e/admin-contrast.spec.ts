import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

function authHeaders(tenantId: string) {
  return { cookie: `${ADMIN_SESSION_COOKIE}=${createAdminSessionToken(tenantId)}` };
}

test("admin branding rejects inaccessible critical contrast before persistence", async ({ request }, testInfo) => {
  const tenantId = testInfo.project.name.includes("mobile") ? "ci-tenant-b" : "ci-tenant-a";
  const headers = authHeaders(tenantId);
  const before = await request.get("/api/admin/settings", { headers });
  expect(before.status()).toBe(200);
  const initial = (await before.json()).settings;

  const unsafe = await request.put("/api/admin/settings", {
    headers,
    data: {
      backgroundColor: "#FFFFFF",
      textColor: "#FFFFFF",
      buttonColor: "#F5B7D2",
    },
  });
  expect(unsafe.status()).toBe(422);
  const error = await unsafe.json();
  expect(error.code).toBe("VALIDATION_ERROR");
  expect(error.issues).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: "textColor" }),
    expect.objectContaining({ field: "buttonColor" }),
  ]));

  const afterUnsafe = await request.get("/api/admin/settings", { headers });
  expect(afterUnsafe.status()).toBe(200);
  const unchanged = (await afterUnsafe.json()).settings;
  expect(unchanged.backgroundColor).toBe(initial.backgroundColor);
  expect(unchanged.textColor).toBe(initial.textColor);
  expect(unchanged.buttonColor).toBe(initial.buttonColor);

  const safe = await request.put("/api/admin/settings", {
    headers,
    data: {
      backgroundColor: "#000000",
      textColor: "#FFFFFF",
      buttonColor: "#000000",
    },
  });
  expect(safe.status()).toBe(200);
  const persisted = (await safe.json()).settings;
  expect(persisted.backgroundColor).toBe("#000000");
  expect(persisted.textColor).toBe("#FFFFFF");
  expect(persisted.buttonColor).toBe("#000000");

  const restored = await request.put("/api/admin/settings", {
    headers,
    data: {
      backgroundColor: initial.backgroundColor,
      textColor: initial.textColor,
      buttonColor: initial.buttonColor,
    },
  });
  expect(restored.status()).toBe(200);
});
