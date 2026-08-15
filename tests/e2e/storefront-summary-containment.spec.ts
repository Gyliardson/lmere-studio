import { expect, test, type Page } from "@playwright/test";

async function reachSummary(page: Page) {
  await page.goto("/ci-tenant-a");

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

  await page.locator("#input-cake-message").fill("Mensagem de demonstração deliberadamente longa para validar contenção visual no resumo final");
  await page.locator("#input-details").fill("Observações extensas de demonstração para manter o fluxo representativo de conteúdo denso em uma viewport móvel curta.");
  await page.locator("#btn-next").click();
  await page.locator("#input-name").fill("Cliente de Demonstração com Nome Longo");
  await page.locator("#input-phone").fill("11999999999");
  await expect(page.getByRole("heading", { name: "Resumo do Pedido" })).toBeVisible();
}

test.describe("storefront summary containment", () => {
  test("final summary and submission action remain clear of the Back navigation", async ({ page }) => {
    await reachSummary(page);

    const submit = page.locator("#btn-send-whatsapp");
    const back = page.locator("#btn-back");
    const navigation = back.locator("xpath=../../..");

    await submit.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const [submitBox, navigationBox, navigationPosition] = await Promise.all([
      submit.boundingBox(),
      navigation.boundingBox(),
      navigation.evaluate((element) => getComputedStyle(element).position),
    ]);

    expect(submitBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(navigationPosition).toBe("static");
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(navigationBox!.y + 1);

    await expect(submit).toBeVisible();
    await expect(back).toBeVisible();

    const viewport = page.viewportSize();
    const scrollMetrics = await page.evaluate(() => ({
      top: window.scrollY,
      max: document.documentElement.scrollHeight - window.innerHeight,
    }));
    expect(scrollMetrics.top).toBeGreaterThanOrEqual(scrollMetrics.max - 2);
    if (viewport?.width === 390) expect(viewport.height).toBe(844);
  });
});
