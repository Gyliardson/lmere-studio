import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function openAdminSection(page: Page, testInfo: TestInfo, label: string, heading: string) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
    await expectNoHorizontalOverflow(page);
  }
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expectNoHorizontalOverflow(page);
}

test.describe("responsive robustness", () => {
  test("storefront tolerates long tenant and catalog content without horizontal overflow", async ({ page }) => {
    await page.route("**/api/tenants/ci-tenant-a", async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      payload.tenant.name = "CI Tenant A — Ateliê de Confeitaria Artesanal com Nome Deliberadamente Muito Longo";
      payload.sizes = payload.sizes.map((size: { name: string; servings: string }, index: number) => index === 0 ? {
        ...size,
        name: "Bolo comemorativo premium com descrição de tamanho deliberadamente extensa",
        servings: "Serve aproximadamente cinquenta convidados em uma descrição longa",
      } : size);
      payload.addons = payload.addons.map((addon: { description?: string }, index: number) => index === 0 ? {
        ...addon,
        description: "Descrição longa de adicional usada para provar truncamento e contenção responsiva sem quebrar a largura da interface.",
      } : addon);
      await route.fulfill({ response, json: payload });
    });

    await page.goto("/ci-tenant-a");
    await expect(page.locator("#simulator-root")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("admin login surface does not overflow its viewport", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("authenticated admin sections stay contained on desktop and mobile", async ({ page }, testInfo) => {
    await page.goto("/admin");
    await page.locator("#admin-slug").fill("ci-tenant-a");
    await page.locator("#admin-password").fill("ci-admin-password");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await openAdminSection(page, testInfo, "Cardápio", "Gestao do Cardapio");
    await openAdminSection(page, testInfo, "Agenda & Limites", "Agenda & Regras de Funcionamento");
    await openAdminSection(page, testInfo, "Marca & Estilo", "Marca & Personalizacao Visual");
    await openAdminSection(page, testInfo, "Funcionalidades", "Funcionalidades & Regras do Ateliê");
  });
});
