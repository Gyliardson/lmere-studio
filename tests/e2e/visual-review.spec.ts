import { mkdir } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const evidenceDir = "visual-evidence";

function safeProjectName(testInfo: TestInfo) {
  return testInfo.project.name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase();
}

async function saveEvidence(page: Page, testInfo: TestInfo, name: string) {
  await mkdir(evidenceDir, { recursive: true });
  await page.screenshot({
    path: `${evidenceDir}/${safeProjectName(testInfo)}-${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

async function reachStorefrontSummary(page: Page) {
  await page.goto("/ci-tenant-a");

  // February 2032 is deterministic and well beyond the configured lead time.
  // CI tenant A is open on Mondays (dayOfWeek=1), so use Monday 09/02/2032.
  const target = { year: 2032, month: 1, day: 9 };
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (target.year - now.year) * 12 + (target.month - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();

  await page.locator(`#cal-day-${target.day}`).click();
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-flavor-a").click();
  await page.locator("#filling-ci-filling-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#btn-next").click();
  await page.locator("#input-name").fill("Cliente de Demonstração");
  await page.locator("#input-phone").fill("11999999999");
}

test.describe("deterministic visual review evidence", () => {
  test("storefront initial and summary states", async ({ page }, testInfo) => {
    await page.goto("/ci-tenant-a");
    await expect(page.getByRole("heading", { name: "CI Tenant A" })).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-initial");

    await reachStorefrontSummary(page);
    await expect(page.getByRole("heading", { name: "Resumo do Pedido" })).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-summary");
  });

  test("admin login and authenticated dashboard states", async ({ page }, testInfo) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();
    await saveEvidence(page, testInfo, "admin-login");

    await page.locator("#admin-slug").fill("ci-tenant-a");
    await page.locator("#admin-password").fill("ci-admin-password");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    await saveEvidence(page, testInfo, "admin-dashboard");
  });
});
