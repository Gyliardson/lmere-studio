import { expect, test, type Page, type TestInfo } from "@playwright/test";

function storefrontDate(testInfo: TestInfo, slot: number) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 6 : 0;
  const retryOffset = testInfo.retry * 12;
  // CI tenant A is open on Mondays (dayOfWeek=1); keep every generated case
  // on that weekday so the accessibility test exercises the intended flow.
  const date = new Date(Date.UTC(2031, 0, 13 + 7 * (slot + projectOffset + retryOffset)));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

async function selectDate(page: Page, testInfo: TestInfo, slot = 0) {
  const target = storefrontDate(testInfo, slot);
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (target.year - now.year) * 12 + (target.month - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();
  const day = page.locator(`#cal-day-${target.day}`);
  await day.click();
  return day;
}

async function reachSummary(page: Page, testInfo: TestInfo) {
  await page.goto("/ci-tenant-a");
  await selectDate(page, testInfo);
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-flavor-a").click();
  await page.locator("#filling-ci-filling-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#btn-next").click();
  await page.locator("#input-name").fill("CI Accessibility Customer");
  await page.locator("#input-phone").fill("11999999999");
}

test.describe("UX accessibility foundation", () => {
  test("storefront exposes a visible keyboard focus treatment", async ({ page }) => {
    await page.goto("/ci-tenant-a");

    // Wait for the async tenant storefront to finish replacing its loading state
    // before starting keyboard traversal. Pressing Tab during that replacement can
    // legitimately lose focus when the loading DOM is unmounted.
    await expect(page.getByRole("button", { name: "Mês anterior" })).toBeVisible();
    await page.keyboard.press("Tab");

    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
    const focusStyle = await focused.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
    });
    expect(focusStyle.outlineStyle).not.toBe("none");
    expect(parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(2);
  });

  test("reduced-motion preference disables decorative motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/ci-tenant-a");

    const maxTransitionDurationMs = await page.locator("#btn-next").evaluate((element) => {
      const durations = getComputedStyle(element).transitionDuration
        .split(",")
        .map((value) => value.trim())
        .map((value) => (value.endsWith("ms") ? Number.parseFloat(value) : Number.parseFloat(value) * 1000));
      return Math.max(...durations);
    });
    expect(maxTransitionDurationMs).toBeLessThanOrEqual(0.01);
  });

  test("stepper, calendar and catalog selections expose semantic state", async ({ page }, testInfo) => {
    await page.goto("/ci-tenant-a");

    const progress = page.getByRole("progressbar", { name: "" });
    await expect(progress).toHaveAttribute("aria-valuenow", "1");
    await expect(page.getByRole("button", { name: "Mês anterior" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próximo mês" })).toBeVisible();

    const day = await selectDate(page, testInfo, 1);
    await expect(day).toHaveAttribute("aria-pressed", "true");
    await page.locator("#btn-next").click();
    await expect(progress).toHaveAttribute("aria-valuenow", "2");

    const size = page.locator("#size-ci-size-a");
    await size.click();
    await expect(size).toHaveAttribute("aria-pressed", "true");
    await page.locator("#btn-next").click();

    const dough = page.locator("#dough-ci-flavor-a");
    const filling = page.locator("#filling-ci-filling-a");
    await dough.click();
    await filling.click();
    await expect(dough).toHaveAttribute("aria-pressed", "true");
    await expect(filling).toHaveAttribute("aria-pressed", "true");
  });

  test("reference upload trigger is reachable from the keyboard", async ({ page }, testInfo) => {
    await page.goto("/ci-tenant-a");
    await selectDate(page, testInfo, 2);
    await page.locator("#btn-next").click();
    await page.locator("#size-ci-size-a").click();
    await page.locator("#btn-next").click();
    await page.locator("#dough-ci-flavor-a").click();
    await page.locator("#filling-ci-filling-a").click();
    await page.locator("#btn-next").click();

    const trigger = page.locator("#dropzone-photo");
    await trigger.focus();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("role", "button");
  });

  test("order submission exposes busy state and focuses recoverable errors", async ({ page }, testInfo) => {
    await reachSummary(page, testInfo);
    await page.route("**/api/orders", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "DATE_BLOCKED", error: "A data selecionada está indisponível" }),
      });
    });

    await page.locator("#btn-send-whatsapp").click();
    await expect(page.locator("#btn-send-whatsapp")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#order-submit-status")).toHaveAttribute("role", "status");

    const status = page.locator("#order-submit-status");
    await expect(status).toHaveAttribute("role", "alert");
    await expect(status).toHaveAttribute("data-code", "DATE_BLOCKED");
    await expect(status).toBeFocused();
    await expect(page.locator("#btn-send-whatsapp")).toHaveAttribute("aria-busy", "false");
  });

  test("admin login remains fully reachable by keyboard", async ({ page }) => {
    await page.goto("/admin");

    const slugInput = page.locator("#admin-slug");
    await expect(slugInput).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(slugInput).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#admin-password")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator("#admin-login-btn")).toBeFocused();
  });
});
