import { expect, test } from "@playwright/test";

test.describe("deterministic storefront smoke", () => {
  test("Tenant A loads without leaking Tenant B fixture data", async ({ page }) => {
    await page.goto("/ci-tenant-a");

    await expect(page.getByRole("heading", { name: "CI Tenant A" })).toBeVisible();
    await expect(page.getByText("Simulador de Encomendas")).toBeVisible();
    await expect(page.locator("#simulator-root")).toBeVisible();

    const body = page.locator("body");
    await expect(body).not.toContainText("CI Tenant B");
    await expect(body).not.toContainText("CI Size B");
    await expect(body).not.toContainText("CI Flavor B");
    await expect(body).not.toContainText("CI Filling B");
  });

  test("unknown tenant exposes a stable not-found state", async ({ page }) => {
    await page.goto("/ci-tenant-missing");

    await expect(page.getByRole("heading", { name: "Ateliê não encontrado" })).toBeVisible();
    await expect(page.getByRole("paragraph")).toHaveText("Ateliê não encontrado");
  });
});
