import { expect, test } from "@playwright/test";

test("critical storefront landmarks and primary action are exposed by role", async ({ page }) => {
  await page.goto("/ci-tenant-a");

  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { name: "CI Tenant A", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Quando sera sua festa/i, level: 2 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar" })).toBeDisabled();
});
