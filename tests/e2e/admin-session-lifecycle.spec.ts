import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lmere-ci-admin-session-secret-at-least-32-bytes";
const SESSION_COOKIE = "lmere_admin_session";

function createSessionToken(tenantId: string, sessionVersion = 0) {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    tenantId,
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    sessionVersion,
  }), "utf8").toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function extractSessionToken(setCookie: string) {
  const match = setCookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  if (!match) throw new Error("Expected admin session cookie in login response");
  return decodeURIComponent(match[1]);
}

async function installSessionCookie(context: Parameters<typeof test>[0] extends never ? never : never) {
  return context;
}

test("admin UI restores a valid cookie-backed session after reload", async ({ context, page }) => {
  await context.addCookies([{ name: SESSION_COOKIE, value: createSessionToken("ci-tenant-a"), domain: "127.0.0.1", path: "/api/admin", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
});

test("admin logout revokes a captured token and allows a fresh session", async ({ context, page }) => {
  const initialLogin = await context.request.post("/api/admin/auth", {
    data: { slug: "ci-tenant-session", password: "ci-admin-password" },
  });
  expect(initialLogin.status()).toBe(200);

  const capturedToken = extractSessionToken(initialLogin.headers()["set-cookie"] ?? "");
  await context.addCookies([{ name: SESSION_COOKIE, value: capturedToken, domain: "127.0.0.1", path: "/api/admin", httpOnly: true, sameSite: "Strict" }]);

  const beforeLogout = await context.request.get("/api/admin/orders", {
    headers: { cookie: `${SESSION_COOKIE}=${capturedToken}` },
  });
  expect(beforeLogout.status()).toBe(200);

  const settingsBeforeLogout = await context.request.get("/api/admin/settings", {
    headers: { cookie: `${SESSION_COOKIE}=${capturedToken}` },
  });
  expect(settingsBeforeLogout.status()).toBe(200);
  const settingsPayload = await settingsBeforeLogout.json();
  expect(settingsPayload.settings).not.toHaveProperty("adminPasswordHash");
  expect(settingsPayload.settings).not.toHaveProperty("adminSessionVersion");

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();

  const viewport = page.viewportSize();
  if (viewport && viewport.width < 768) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
    await page.getByRole("button", { name: "Sair do Painel" }).click();
  } else {
    await page.getByRole("button", { name: "Sair", exact: true }).click();
  }

  await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();

  const cookiesAfterLogout = await context.cookies("http://127.0.0.1:3000/api/admin/auth");
  expect(cookiesAfterLogout.some((cookie) => cookie.name === SESSION_COOKIE)).toBe(false);

  for (const route of ["/api/admin/auth", "/api/admin/orders", "/api/admin/menu", "/api/admin/calendar", "/api/admin/settings"]) {
    const replay = await context.request.get(route, {
      headers: { cookie: `${SESSION_COOKIE}=${capturedToken}` },
    });
    expect(replay.status(), `captured pre-logout token must be rejected by ${route}`).toBe(401);
  }

  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();

  const freshLogin = await context.request.post("/api/admin/auth", {
    data: { slug: "ci-tenant-session", password: "ci-admin-password" },
  });
  expect(freshLogin.status()).toBe(200);
  const freshToken = extractSessionToken(freshLogin.headers()["set-cookie"] ?? "");

  const restored = await context.request.get("/api/admin/orders", {
    headers: { cookie: `${SESSION_COOKIE}=${freshToken}` },
  });
  expect(restored.status()).toBe(200);
});
