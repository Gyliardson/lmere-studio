import { expect, test, type Page, type TestInfo } from "@playwright/test";

function storefrontDate(testInfo: TestInfo) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 4 : 0;
  const retryOffset = testInfo.retry * 10;
  const date = new Date(Date.UTC(2030, 4, 20 + 7 * (projectOffset + retryOffset)));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

async function reachCustomDetails(page: Page, testInfo: TestInfo) {
  await page.goto("/ci-custom-a");
  const target = storefrontDate(testInfo);
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (target.year - now.year) * 12 + (target.month - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();
  await page.locator(`#cal-day-${target.day}`).click();
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-custom-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-custom-dough-a").click();
  await page.locator("#filling-ci-custom-filling-a").click();
  await page.locator("#btn-next").click();
}

test("custom fields are keyboard-accessible, required and included in confirmed handoff", async ({ page, context }, testInfo) => {
  await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
  await reachCustomDetails(page, testInfo);

  const theme = page.getByLabel("Tema da festa *");
  const style = page.getByLabel("Estilo *");
  const guests = page.getByLabel("Convidados extras");
  await expect(theme).toBeVisible();
  await expect(style).toBeVisible();
  await expect(guests).toBeVisible();
  await expect(page.locator("#btn-next")).toBeDisabled();

  await theme.focus();
  await theme.fill("Jardim encantado");
  await style.selectOption("Moderno");
  await guests.fill("12");
  await expect(page.locator("#btn-next")).toBeEnabled();
  await page.locator("#btn-next").click();

  await expect(page.getByText("Informações personalizadas")).toBeVisible();
  await expect(page.getByText("Jardim encantado")).toBeVisible();
  await expect(page.getByText("Moderno", { exact: true })).toBeVisible();
  await expect(page.getByText("12", { exact: true })).toBeVisible();

  await page.locator("#input-name").fill("Cliente Custom Fields");
  await page.locator("#input-phone").fill("11999990001");
  const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#btn-send-whatsapp").click();

  const response = await responsePromise;
  expect(response.status()).toBe(201);
  const body = await response.json();
  expect(body.customFields).toEqual([
    { id: "ci-custom-guests-a", label: "Convidados extras", type: "number", value: "12" },
    { id: "ci-custom-style-a", label: "Estilo", type: "select", value: "Moderno" },
    { id: "ci-custom-theme-a", label: "Tema da festa", type: "text", value: "Jardim encantado" },
  ]);

  const popup = await popupPromise;
  await popup.waitForURL(/wa\.me/);
  const message = new URL(popup.url()).searchParams.get("text") ?? "";
  expect(message).toContain("Informações personalizadas");
  expect(message).toContain("*Tema da festa:* Jardim encantado");
  expect(message).toContain("*Estilo:* Moderno");
  expect(message).toContain("*Convidados extras:* 12");
});
