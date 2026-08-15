import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const BOUNDARY_NAME = "N".repeat(120);
const BOUNDARY_MESSAGE = "M".repeat(200);
const BOUNDARY_DETAILS = "D".repeat(2000);
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lmere-ci-admin-session-secret-at-least-32-bytes";

function adminToken() {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    tenantId: "ci-tenant-a",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    sessionVersion: 0,
  }), "utf8").toString("base64url");
  return `${payload}.${createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url")}`;
}

async function installAdminSession(context: BrowserContext) {
  await context.addCookies([{
    name: "lmere_admin_session",
    value: adminToken(),
    domain: "127.0.0.1",
    path: "/api/admin",
    httpOnly: true,
    sameSite: "Strict",
  }]);
}

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

  await expect(page.locator("#input-cake-message")).toHaveAttribute("maxlength", "200");
  await expect(page.locator("#input-details")).toHaveAttribute("maxlength", "2000");
  await page.locator("#input-cake-message").fill(BOUNDARY_MESSAGE);
  await page.locator("#input-details").fill(BOUNDARY_DETAILS);
  await page.locator("#btn-next").click();
  await expect(page.locator("#input-name")).toHaveAttribute("maxlength", "120");
  await page.locator("#input-name").fill(BOUNDARY_NAME);
  await page.locator("#input-phone").fill("11999999999");
  await expect(page.getByRole("heading", { name: "Resumo do Pedido" })).toBeVisible();
}

test.describe("storefront summary containment", () => {
  test("final summary contains boundary-valid customer text without horizontal overflow", async ({ page }) => {
    await reachSummary(page);

    const submit = page.locator("#btn-send-whatsapp");
    const back = page.locator("#btn-back");
    const navigation = back.locator("xpath=../../..");

    await submit.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const [submitBox, navigationBox, navigationPosition, widths] = await Promise.all([
      submit.boundingBox(),
      navigation.boundingBox(),
      navigation.evaluate((element) => getComputedStyle(element).position),
      page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth })),
    ]);

    expect(submitBox).not.toBeNull();
    expect(navigationBox).not.toBeNull();
    expect(navigationPosition).toBe("static");
    expect(submitBox!.y + submitBox!.height).toBeLessThanOrEqual(navigationBox!.y + 1);
    expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 1);

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

  test("boundary-valid customer text survives WhatsApp handoff and admin rendering", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => {
      await route.fulfill({ status: 200, contentType: "text/plain", body: "WhatsApp handoff intercepted by E2E" });
    });
    await reachSummary(page);
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#btn-send-whatsapp").click();
    const popup = await popupPromise;

    await expect(page.locator("#order-submit-status")).toHaveAttribute("data-state", "confirmed");
    await popup.waitForURL(/wa\.me\//);
    const url = new URL(popup.url());
    const message = url.searchParams.get("text") ?? "";
    expect(message).toContain(`*Cliente:* ${BOUNDARY_NAME}`);
    expect(message).toContain(`*Mensagem/Placa:* ${BOUNDARY_MESSAGE}`);
    expect(message).toContain(`*Observações:* ${BOUNDARY_DETAILS}`);
    await popup.close();

    await installAdminSession(context);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
    const orderCard = page.getByRole("button").filter({ hasText: BOUNDARY_NAME }).first();
    await expect(orderCard).toBeVisible();
    await orderCard.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(BOUNDARY_MESSAGE);
    await expect(dialog).toContainText(BOUNDARY_DETAILS);
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(widths.scroll).toBeLessThanOrEqual(widths.viewport + 1);
  });
});
