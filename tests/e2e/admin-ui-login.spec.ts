import { expect, test } from "@playwright/test";

test("admin UI authenticates a deterministic CI tenant", async ({ page }) => {
  await page.goto("/admin");
  await page.locator("#admin-slug").fill("ci-tenant-a");
  await page.locator("#admin-password").fill("ci-admin-password");
  await page.locator("#admin-login-btn").click();
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
});
