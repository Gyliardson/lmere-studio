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

async function navigateToDate(page: Page, target: { year: number; month: number; day: number }) {
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (target.year - now.year) * 12 + (target.month - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();
  await page.locator(`#cal-day-${target.day}`).click();
}

async function reachStorefrontReferenceStep(page: Page) {
  await page.goto("/ci-tenant-a");
  await navigateToDate(page, { year: 2032, month: 1, day: 9 });
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-flavor-a").click();
  await page.locator("#filling-ci-filling-a").click();
  await page.locator("#btn-next").click();
  await expect(page.locator("#input-file-photo")).toBeAttached();
}

async function reachCustomFieldStep(page: Page) {
  await page.goto("/ci-custom-a");
  await navigateToDate(page, { year: 2032, month: 1, day: 9 });
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-custom-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-custom-dough-a").click();
  await page.locator("#filling-ci-custom-filling-a").click();
  await page.locator("#btn-next").click();
  await expect(page.getByLabel("Tema da festa *")).toBeVisible();
}

async function openAdminSection(page: Page, testInfo: TestInfo, label: string, heading: string) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name: label, exact: true }).click();
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function loginAdmin(page: Page, slug: string) {
  await page.goto("/admin");
  await page.locator("#admin-slug").fill(slug);
  await page.locator("#admin-password").fill("ci-admin-password");
  await page.locator("#admin-login-btn").click();
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
}

test.describe("deterministic visual review evidence", () => {
  test("storefront initial, image-reference and summary states", async ({ page }, testInfo) => {
    await page.goto("/ci-tenant-a");
    await expect(page.getByRole("heading", { name: "CI Tenant A" })).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-initial");

    await reachStorefrontReferenceStep(page);
    await expect(page.getByText("Foto de Referência (opcional)")).toBeVisible();
    await expect(page.getByText("PNG, JPG ou WEBP até 2 MB")).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-reference-image");

    await page.locator("#btn-next").click();
    await page.locator("#input-name").fill("Cliente de Demonstração");
    await page.locator("#input-phone").fill("11999999999");
    await expect(page.getByRole("heading", { name: "Resumo do Pedido" })).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-summary");
  });

  test("custom-field storefront details and summary", async ({ page }, testInfo) => {
    await reachCustomFieldStep(page);
    await saveEvidence(page, testInfo, "storefront-custom-fields");

    await page.getByLabel("Tema da festa *").fill("Jardim encantado");
    await page.getByLabel("Estilo *").selectOption("Moderno");
    await page.getByLabel("Convidados extras").fill("12");
    await page.locator("#btn-next").click();
    await page.locator("#input-name").fill("Cliente de Demonstração");
    await page.locator("#input-phone").fill("11999999999");
    await expect(page.getByText("Informações personalizadas")).toBeVisible();
    await saveEvidence(page, testInfo, "storefront-custom-fields-summary");
  });

  test("admin login and representative authenticated sections", async ({ page }, testInfo) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Painel Admin" })).toBeVisible();
    await saveEvidence(page, testInfo, "admin-login");

    await page.locator("#admin-slug").fill("ci-tenant-a");
    await page.locator("#admin-password").fill("ci-admin-password");
    await page.locator("#admin-login-btn").click();
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    await saveEvidence(page, testInfo, "admin-orders");

    await openAdminSection(page, testInfo, "Cardápio", "Gestao do Cardapio");
    await saveEvidence(page, testInfo, "admin-menu");
    await page.getByRole("tab", { name: /Massas & Recheios/ }).click();
    await page.getByRole("button", { name: "Editar CI Flavor A" }).click();
    const editor = page.getByRole("dialog", { name: "Editar Item" });
    await expect(editor).toBeVisible();
    await expect(editor.getByText("PNG, JPG ou WEBP até 2 MB")).toBeVisible();
    await saveEvidence(page, testInfo, "admin-reference-image-editor");
    await page.getByRole("button", { name: "Fechar edição do item" }).click();

    await openAdminSection(page, testInfo, "Agenda & Limites", "Agenda & Regras de Funcionamento");
    await saveEvidence(page, testInfo, "admin-calendar");

    await openAdminSection(page, testInfo, "Marca & Estilo", "Marca & Personalizacao Visual");
    await saveEvidence(page, testInfo, "admin-brand");

    await openAdminSection(page, testInfo, "Funcionalidades", "Funcionalidades & Regras do Ateliê");
    await saveEvidence(page, testInfo, "admin-features");
  });

  test("admin custom-field configuration", async ({ page }, testInfo) => {
    await loginAdmin(page, "ci-custom-a");
    await openAdminSection(page, testInfo, "Funcionalidades", "Funcionalidades & Regras do Ateliê");
    await expect(page.getByRole("heading", { name: "Campos personalizados" })).toBeVisible();
    await expect(page.getByText("Tema da festa")).toBeVisible();
    await expect(page.getByText("Seleção: Clássico · Moderno")).toBeVisible();
    await saveEvidence(page, testInfo, "admin-custom-fields");
  });
});
