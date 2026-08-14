import { mkdir } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

const outputDir = "docs/media/generated";
const representativeEventDate = "2032-02-09";

function projectName(testInfo: TestInfo) {
  return testInfo.project.name.includes("mobile") ? "mobile" : "desktop";
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = false) {
  await mkdir(outputDir, { recursive: true });
  await page.screenshot({
    path: `${outputDir}/${projectName(testInfo)}-${name}.png`,
    fullPage,
    animations: "disabled",
  });
}

async function reachSummary(page: Page) {
  await page.goto("/ci-tenant-a");
  const target = { year: 2032, month: 1, day: 9 }; // Monday, 09/02/2032.
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
  await expect(page.getByRole("heading", { name: "Resumo do Pedido" })).toBeVisible();
}

async function ensureRepresentativeOrder(page: Page) {
  const response = await page.request.post("/api/orders", {
    headers: { "Idempotency-Key": "portfolio-media-representative-order-v1" },
    data: {
      tenantId: "ci-tenant-a",
      customerName: "Cliente de Demonstração",
      customerPhone: "11999999999",
      eventDate: representativeEventDate,
      cakeSizeId: "ci-size-a",
      flavorId: "ci-flavor-a",
      fillingIds: ["ci-filling-a"],
      addonIds: ["ci-addon-a"],
      cakeMessage: "Parabéns!",
      details: "Pedido sintético para evidência visual reproduzível.",
    },
  });
  expect([200, 201]).toContain(response.status());
}

async function openAdminSection(page: Page, testInfo: TestInfo, label: string, heading: string) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

test.describe("portfolio documentation capture", () => {
  test("captures storefront states", async ({ page }, testInfo) => {
    await page.goto("/ci-tenant-a");
    await expect(page.getByRole("heading", { name: "CI Tenant A" })).toBeVisible();
    await capture(page, testInfo, "storefront", true);

    await reachSummary(page);
    await capture(page, testInfo, "storefront-summary", true);
  });

  test("captures representative admin states", async ({ page }, testInfo) => {
    await ensureRepresentativeOrder(page);
    await page.goto("/admin");
    await page.locator("#admin-slug").fill("ci-tenant-a");
    await page.locator("#admin-password").fill("ci-admin-password");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    await expect(page.getByText("Cliente de Demonstração")).toBeVisible();
    await capture(page, testInfo, "admin-orders", true);

    await openAdminSection(page, testInfo, "Cardápio", "Gestao do Cardapio");
    await capture(page, testInfo, "admin-menu", true);

    await openAdminSection(page, testInfo, "Marca & Estilo", "Marca & Personalizacao Visual");
    await capture(page, testInfo, "admin-brand", true);
  });
});
