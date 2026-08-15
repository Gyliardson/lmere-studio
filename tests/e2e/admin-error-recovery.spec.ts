import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

async function openAuthenticatedAdmin(context: BrowserContext, page: Page, testInfo: TestInfo) {
  const tenantId = testInfo.project.name.includes("mobile") ? "ci-tenant-b" : "ci-tenant-a";
  await context.addCookies([
    {
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(tenantId),
      domain: "127.0.0.1",
      path: "/api/admin",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
}

async function selectAdminSection(page: Page, testInfo: TestInfo, name: string) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name, exact: true }).click();
}

test("menu loader surfaces a rejected server response", async ({ context, page }, testInfo) => {
  await openAuthenticatedAdmin(context, page, testInfo);
  await page.route("**/api/admin/menu?**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Cardápio temporariamente indisponível" }) });
  });

  await selectAdminSection(page, testInfo, "Cardápio");
  await expect(page.getByRole("heading", { name: "Gestao do Cardapio" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Cardápio temporariamente indisponível");
});

test("branding loader surfaces a rejected server response", async ({ context, page }, testInfo) => {
  await openAuthenticatedAdmin(context, page, testInfo);
  await page.route("**/api/admin/settings?**", async (route) => {
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Configuração de marca indisponível" }) });
  });

  await selectAdminSection(page, testInfo, "Marca & Estilo");
  await expect(page.getByRole("heading", { name: "Marca & Personalizacao Visual" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Configuração de marca indisponível");
});
