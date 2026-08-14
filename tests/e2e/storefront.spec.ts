import { expect, test, type Page } from "@playwright/test";

async function reachSummary(page: Page, sizeId = "ci-size-a") {
  await page.goto("/ci-tenant-a");

  const targetYear = 2030;
  const targetMonth = 1;
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (targetYear - now.year) * 12 + (targetMonth - now.month);
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();

  await page.locator("#cal-day-14").click();
  await page.locator("#btn-next").click();
  await page.locator(`#size-${sizeId}`).click();
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
    await expect(page.getByText("Antecedência mínima configurada: 3 dias.")).toBeVisible();
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

  test("invalid browser phone prevents order submission", async ({ page }) => {
    await reachSummary(page);
    await page.locator("#input-phone").fill("123");

    await expect(page.getByText("Informe um telefone/WhatsApp válido com DDD")).toBeVisible();
    await expect(page.locator("#btn-send-whatsapp")).toBeDisabled();
  });

  test("storefront persists the order before WhatsApp handoff and exposes server pricing", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
    await reachSummary(page);

    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    const popupPromise = page.waitForEvent("popup");
    await page.locator("#btn-send-whatsapp").click();

    await expect(page.locator("#order-submit-status")).toContainText("Confirmando disponibilidade e valores");
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.pricing).toEqual({ subtotal: 110, depositAmount: 55, depositMode: "50_percent" });

    await expect(page.locator("#order-submit-status")).toContainText("Total confirmado pelo servidor: R$ 110,00");
    await expect(page.locator("#order-submit-status")).toContainText(body.order.id);

    const popup = await popupPromise;
    await popup.waitForURL(/wa\.me/);
    const message = new URL(popup.url()).searchParams.get("text") ?? "";
    expect(message).toContain("Valores confirmados pelo servidor");
    expect(message).toContain("R$ 110,00");
    expect(message).toContain(body.order.id);
  });

  test("double submit while pending produces one order request and one handoff", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
    await reachSummary(page);

    let orderRequests = 0;
    let popupCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/orders") && request.method() === "POST") orderRequests += 1;
    });
    page.on("popup", () => { popupCount += 1; });

    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    await page.evaluate(() => {
      const button = document.querySelector<HTMLButtonElement>("#btn-send-whatsapp");
      button?.click();
      button?.click();
    });

    await responsePromise;
    await expect.poll(() => orderRequests).toBe(1);
    await expect.poll(() => popupCount).toBe(1);
  });

  test("a later intentional identical submit gets a fresh order attempt", async ({ page, context }) => {
    await context.route("https://wa.me/**", async (route) => route.fulfill({ status: 200, body: "ok" }));
    await reachSummary(page);

    const firstResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    const firstPopupPromise = page.waitForEvent("popup");
    await page.locator("#btn-send-whatsapp").click();
    const firstResponse = await firstResponsePromise;
    const firstBody = await firstResponse.json();
    const firstPopup = await firstPopupPromise;
    await firstPopup.close();

    const secondResponsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    const secondPopupPromise = page.waitForEvent("popup");
    await page.locator("#btn-send-whatsapp").click();
    const secondResponse = await secondResponsePromise;
    const secondBody = await secondResponse.json();
    const secondPopup = await secondPopupPromise;
    await secondPopup.close();

    expect(firstResponse.status()).toBe(201);
    expect(secondResponse.status()).toBe(201);
    expect(secondBody.order.id).not.toBe(firstBody.order.id);
    expect(secondBody.idempotentReplay).toBe(false);
  });

  test("structured server rejection is surfaced inline and aborts WhatsApp handoff", async ({ page, context }) => {
    await reachSummary(page);
    await page.route("**/api/orders", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ code: "DATE_BLOCKED", error: "A data selecionada está indisponível" }),
      });
    });

    await page.locator("#btn-send-whatsapp").click();

    const status = page.locator("#order-submit-status");
    await expect(status).toHaveAttribute("role", "alert");
    await expect(status).toHaveAttribute("data-state", "error");
    await expect(status).toHaveAttribute("data-code", "DATE_BLOCKED");
    await expect(status).toHaveText("A data selecionada está indisponível");
    await expect(page.locator("#btn-send-whatsapp")).toBeEnabled();
    await expect.poll(() => context.pages().filter((candidate) => candidate !== page && !candidate.isClosed()).length).toBe(0);
    expect(context.pages().some((candidate) => candidate.url().startsWith("https://wa.me/"))).toBe(false);
  });

  test("real server rejects stale cross-tenant catalog data from the storefront", async ({ page, context }) => {
    await page.route("**/api/tenants/ci-tenant-a", async (route) => {
      const response = await route.fetch();
      const payload = await response.json();
      payload.sizes = payload.sizes.map((size: { id: string }, index: number) => index === 0 ? { ...size, id: "ci-size-b" } : size);
      await route.fulfill({ response, json: payload });
    });

    await reachSummary(page, "ci-size-b");
    const responsePromise = page.waitForResponse((response) => response.url().endsWith("/api/orders") && response.request().method() === "POST");
    await page.locator("#btn-send-whatsapp").click();

    const response = await responsePromise;
    expect(response.status()).toBe(400);
    expect((await response.json()).code).toBe("INVALID_CAKE_SIZE");
    await expect(page.locator("#order-submit-status")).toHaveAttribute("data-state", "error");
    await expect(page.locator("#order-submit-status")).toHaveAttribute("data-code", "INVALID_CAKE_SIZE");
    await expect(page.locator("#order-submit-status")).toContainText("Tamanho inválido ou indisponível");
    await expect.poll(() => context.pages().filter((candidate) => candidate !== page && !candidate.isClosed()).length).toBe(0);
  });
});
