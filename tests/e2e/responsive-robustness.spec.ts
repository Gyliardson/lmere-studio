import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
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
});
