import path from "node:path";
import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

const shouldRunAxe = process.env.AXE_SCAN === "1";

type AxeViolation = {
  id: string;
  impact: string | null;
  help: string;
  nodes: unknown[];
};

type AxeResults = {
  violations: AxeViolation[];
};

async function expectNoSeriousOrCriticalAxeViolations(page: Page, label: string) {
  const axeSource = path.join(process.cwd(), "node_modules", "axe-core", "axe.min.js");
  await page.addScriptTag({ path: axeSource });
  const results = await page.evaluate(async () => {
    const axe = (globalThis as unknown as { axe: { run: () => Promise<AxeResults> } }).axe;
    return axe.run();
  });
  const blocking = results.violations.filter((violation) =>
    violation.impact === "serious" || violation.impact === "critical"
  );
  expect(blocking, `${label} has serious/critical axe violations:\n${JSON.stringify(blocking, null, 2)}`).toEqual([]);
}

function storefrontDate(testInfo: TestInfo) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 6 : 0;
  const retryOffset = testInfo.retry * 12;
  const date = new Date(Date.UTC(2032, 1, 13 + 7 * (projectOffset + retryOffset)));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

async function reachStorefrontSummary(page: Page, testInfo: TestInfo) {
  await page.goto("/ci-tenant-a");

  const target = storefrontDate(testInfo);
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
  await page.locator("#input-name").fill("CI Axe Customer");
  await page.locator("#input-phone").fill("11000000000");
  await expect(page.locator("#btn-send-whatsapp")).toBeEnabled();
}

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

async function openAdminMenu(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name: "Cardápio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestao do Cardapio" })).toBeVisible();
}

test.describe("representative axe gate", () => {
  test.skip(!shouldRunAxe, "Axe is installed only in the dedicated E2E gate");

  test("loaded storefront has no serious or critical axe violations", async ({ page }, testInfo) => {
    const slug = testInfo.project.name.includes("mobile") ? "ci-tenant-b" : "ci-tenant-a";
    await page.goto(`/${slug}`);
    await expect(page.getByRole("main")).toBeVisible();
    await expectNoSeriousOrCriticalAxeViolations(page, `${testInfo.project.name} loaded storefront`);
  });

  test("storefront summary has no serious or critical axe violations", async ({ page }, testInfo) => {
    await reachStorefrontSummary(page, testInfo);
    await expectNoSeriousOrCriticalAxeViolations(page, `${testInfo.project.name} storefront summary`);
  });

  test("storefront error state has no serious or critical axe violations", async ({ page }, testInfo) => {
    await page.goto("/tenant-that-does-not-exist");
    await expect(page.getByRole("alert")).toBeVisible();
    await expectNoSeriousOrCriticalAxeViolations(page, `${testInfo.project.name} storefront error`);
  });

  test("authenticated admin and edit dialog have no serious or critical axe violations", async ({ context, page }, testInfo) => {
    await openAuthenticatedAdmin(context, page, testInfo);
    await expectNoSeriousOrCriticalAxeViolations(page, `${testInfo.project.name} admin orders`);

    await openAdminMenu(page, testInfo);
    const editName = testInfo.project.name.includes("mobile") ? "Editar CI Size B" : "Editar CI Size A";
    await page.getByRole("button", { name: editName }).click();
    await expect(page.getByRole("dialog", { name: "Editar Item" })).toBeVisible();
    await expectNoSeriousOrCriticalAxeViolations(page, `${testInfo.project.name} admin edit dialog`);
  });
});
