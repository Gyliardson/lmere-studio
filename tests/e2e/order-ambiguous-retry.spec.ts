import { expect, test, type Page, type TestInfo } from "@playwright/test";

function retryDate(testInfo: TestInfo) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 1 : 0;
  const retryOffset = testInfo.retry * 2;
  const date = new Date(Date.UTC(2035, 0, 9 + 7 * (projectOffset + retryOffset)));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

async function reachSummary(page: Page, testInfo: TestInfo) {
  await page.goto("/ci-tenant-a");
  const target = retryDate(testInfo);
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
  await page.locator("#input-name").fill("CI Ambiguous Retry Customer");
  await page.locator("#input-phone").fill("11000000000");
}

test("committed order is recovered after a lost browser response without duplicating it", async ({ page, context }, testInfo) => {
  await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
  await reachSummary(page, testInfo);

  let intercepted = 0;
  const keys: string[] = [];
  let committedOrderId = "";

  await page.route("**/api/orders", async (route) => {
    intercepted += 1;
    keys.push(route.request().headers()["idempotency-key"] ?? "");

    if (intercepted === 1) {
      const serverResponse = await route.fetch();
      expect(serverResponse.status()).toBe(201);
      const body = await serverResponse.json();
      committedOrderId = body.order.id;
      // The server committed successfully, but the browser never receives the
      // response. This is the ambiguous outcome that must retain the same key.
      await route.abort("failed");
      return;
    }

    await route.continue();
  });

  await page.locator("#btn-send-whatsapp").click();
  const status = page.locator("#order-submit-status");
  await expect(status).toHaveAttribute("data-state", "error");
  await expect(status).toHaveAttribute("data-code", "ORDER_CONFIRMATION_UNKNOWN");
  await expect(status).toContainText("recuperar a mesma tentativa");
  await expect(page.locator("#btn-send-whatsapp")).toBeEnabled();

  const recoveryResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/orders") && response.request().method() === "POST",
  );
  const recoveryPopupPromise = page.waitForEvent("popup");
  await page.locator("#btn-send-whatsapp").click();
  const recoveryResponse = await recoveryResponsePromise;
  const recoveryBody = await recoveryResponse.json();
  const recoveryPopup = await recoveryPopupPromise;
  await recoveryPopup.close();

  expect(recoveryResponse.status()).toBe(200);
  expect(recoveryBody.idempotentReplay).toBe(true);
  expect(recoveryBody.order.id).toBe(committedOrderId);
  expect(keys[1]).toBe(keys[0]);
  await expect(status).toHaveAttribute("data-state", "confirmed");
  await expect(status).toContainText(committedOrderId);

  const laterResponsePromise = page.waitForResponse((response) =>
    response.url().endsWith("/api/orders") && response.request().method() === "POST",
  );
  const laterPopupPromise = page.waitForEvent("popup");
  await page.locator("#btn-send-whatsapp").click();
  const laterResponse = await laterResponsePromise;
  const laterBody = await laterResponse.json();
  const laterPopup = await laterPopupPromise;
  await laterPopup.close();

  expect(laterResponse.status()).toBe(201);
  expect(laterBody.idempotentReplay).toBe(false);
  expect(laterBody.order.id).not.toBe(committedOrderId);
  expect(keys[2]).not.toBe(keys[0]);
});
