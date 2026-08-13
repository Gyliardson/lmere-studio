import { expect, test, type Page } from "@playwright/test";

async function reachSummary(page: Page) {
  await page.goto("/ci-tenant-a");

  const targetYear = 2030;
  const targetMonth = 1;
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (targetYear - now.year) * 12 + (targetMonth - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();

  await page.locator("#cal-day-14").click();
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-flavor-a").click();
  await page.locator("#filling-ci-filling-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#btn-next").click();
  await page.locator("#input-name").fill("CI Storefront Customer");
  await page.locator("#input-phone").fill("11000000000");
}

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

  test("storefront persists the order before WhatsApp handoff and uses server pricing", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
    await reachSummary(page);

    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#btn-send-whatsapp").click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.pricing).toEqual({ subtotal: 110, depositAmount: 55, depositMode: "50_percent" });

    const popup = await popupPromise;
    await popup.waitForURL(/wa\.me/);
    const message = new URL(popup.url()).searchParams.get("text") ?? "";
    expect(message).toContain("Valores confirmados pelo servidor");
    expect(message).toContain("R$ 110,00");
    expect(message).toContain(body.order.id);
  });

  test("double submit while pending produces one order request", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
    await reachSummary(page);

    let orderRequests = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/orders") && request.method() === "POST") orderRequests += 1;
    });

    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>("#btn-send-whatsapp");
      button?.click();
      button?.click();
    });

    await page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    await expect.poll(() => orderRequests).toBe(1);
  });
});
