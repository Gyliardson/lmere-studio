import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lmere-ci-admin-session-secret-at-least-32-bytes";

function createSessionToken(tenantId: string) {
  const payload = Buffer.from(JSON.stringify({ version: 1, tenantId, expiresAt: Math.floor(Date.now() / 1000) + 3600 }), "utf8").toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

test("admin UI restores a valid cookie-backed session after reload", async ({ context, page }) => {
  await context.addCookies([{ name: "lmere_admin_session", value: createSessionToken("ci-tenant-a"), domain: "127.0.0.1", path: "/api/admin", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
});

test("admin logout revokes the cookie-backed session across reloads", async ({ context, page }) => {
  await context.addCookies([{ name: "lmere_admin_session", value: createSessionToken("ci-tenant-a"), domain: "127.0.0.1", path: "/api/admin", httpOnly: true, sameSite: "Strict" }]);
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

  const cookies = await context.cookies("http://127.0.0.1:3000/api/admin/auth");
  expect(cookies.some((cookie) => cookie.name === "lmere_admin_session")).toBe(false);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();
});
