import { expect, test } from "@playwright/test";

test.describe("loading, empty and error states", () => {
  test("storefront exposes loading and unavailable-tenant states", async ({ page }) => {
    await page.route("**/api/tenants/ci-tenant-a", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.continue();
    });

    await page.goto("/ci-tenant-a", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Carregando...", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CI Tenant A" })).toBeVisible();

    await page.goto("/tenant-that-does-not-exist");
    await expect(page.getByRole("heading", { name: "Ateliê não encontrado" })).toBeVisible();
    await expect(page.locator("p", { hasText: "Ateliê não encontrado" })).toBeVisible();
  });

  test("admin exposes session loading, authentication error and empty orders", async ({ page }) => {
    await page.route("**/api/admin/auth", async (route) => {
      if (route.request().method() === "GET") {
        await new Promise((resolve) => setTimeout(resolve, 150));
      }
      await route.continue();
    });

    await page.goto("/admin", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Validando sessão...", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();

    await page.locator("#admin-slug").fill("ci-tenant-a");
    await page.locator("#admin-password").fill("senha-incorreta");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByText("Credenciais inválidas", { exact: true })).toBeVisible();

    await page.route("**/api/admin/orders**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ orders: [] }),
      });
    });
    await page.locator("#admin-password").fill("ci-admin-password");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    await expect(page.getByText("Nenhum pedido encontrado nesta categoria")).toBeVisible();
  });
});
