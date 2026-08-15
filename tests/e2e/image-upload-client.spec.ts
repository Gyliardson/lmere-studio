import { createHmac } from "node:crypto";
import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { IMAGE_REFERENCE_LIMITS } from "../../src/lib/image-reference";

const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "lmere-ci-admin-session-secret-at-least-32-bytes";

type FileReaderProbeWindow = Window & { __imageReferenceReads?: number };

function createSessionToken(tenantId: string) {
  const payload = Buffer.from(
    JSON.stringify({ version: 1, tenantId, expiresAt: Math.floor(Date.now() / 1000) + 3600 }),
    "utf8",
  ).toString("base64url");
  const signature = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

async function installFileReaderProbe(page: Page) {
  await page.addInitScript(() => {
    const original = FileReader.prototype.readAsDataURL;
    const probeWindow = window as FileReaderProbeWindow;
    probeWindow.__imageReferenceReads = 0;
    FileReader.prototype.readAsDataURL = function readAsDataURL(blob: Blob) {
      probeWindow.__imageReferenceReads = (probeWindow.__imageReferenceReads ?? 0) + 1;
      return original.call(this, blob);
    };
  });
}

async function fileReaderCount(page: Page) {
  return page.evaluate(() => (window as FileReaderProbeWindow).__imageReferenceReads ?? 0);
}

function storefrontTarget(testInfo: TestInfo) {
  const projectOffset = testInfo.project.name.includes("mobile") ? 7 : 0;
  const retryOffset = testInfo.retry * 14;
  const date = new Date(Date.UTC(2037, 0, 5 + projectOffset + retryOffset));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth(), day: date.getUTCDate() };
}

async function reachReferenceStep(page: Page, testInfo: TestInfo) {
  await page.goto("/ci-tenant-a");
  const target = storefrontTarget(testInfo);
  const now = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
  const monthsForward = (target.year - now.year) * 12 + target.month - now.month;
  for (let index = 0; index < monthsForward; index += 1) await page.locator("#cal-next").click();
  await page.locator(`#cal-day-${target.day}`).click();
  await page.locator("#btn-next").click();
  await page.locator("#size-ci-size-a").click();
  await page.locator("#btn-next").click();
  await page.locator("#dough-ci-flavor-a").click();
  await page.locator("#filling-ci-filling-a").click();
  await page.locator("#btn-next").click();
  await expect(page.locator("#input-file-photo")).toBeAttached();
}

async function openAdminFlavorEditor(context: BrowserContext, page: Page, testInfo: TestInfo) {
  await context.addCookies([
    {
      name: "lmere_admin_session",
      value: createSessionToken("ci-tenant-a"),
      domain: "127.0.0.1",
      path: "/api/admin",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name: "Cardápio", exact: true }).click();
  await page.getByRole("tab", { name: /Massas & Recheios/ }).click();
  await page.getByRole("button", { name: "Editar CI Flavor A" }).click();
  await expect(page.getByRole("dialog", { name: "Editar Item" })).toBeVisible();
}

test.describe("bounded image upload clients", () => {
  test("storefront rejects unsupported and oversized files before FileReader", async ({ page }, testInfo) => {
    await installFileReaderProbe(page);
    await reachReferenceStep(page, testInfo);

    const input = page.locator("#input-file-photo");
    await input.setInputFiles({ name: "reference.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await expect(page.getByRole("alert")).toContainText("Use uma imagem PNG, JPG ou WEBP.");
    expect(await fileReaderCount(page)).toBe(0);

    await input.setInputFiles({
      name: "reference.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(IMAGE_REFERENCE_LIMITS.maxBytes + 1, 0x41),
    });
    await expect(page.getByRole("alert")).toContainText("no máximo 2 MB");
    expect(await fileReaderCount(page)).toBe(0);
    await expect(page.getByText("PNG, JPG ou WEBP até 2 MB")).toBeVisible();
  });

  test("storefront validates URL before committing external preview", async ({ page }, testInfo) => {
    await reachReferenceStep(page, testInfo);
    const urlInput = page.locator("#input-reference-url");

    await urlInput.fill("http://images.example.test/reference.png");
    await urlInput.blur();
    await expect(page.getByRole("alert")).toContainText("URL HTTPS");
    await expect(urlInput).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByAltText("Foto de referência")).toHaveCount(0);

    await urlInput.fill("https://images.example.test/reference.png");
    await urlInput.blur();
    const preview = page.getByAltText("Foto de referência");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("referrerpolicy", "no-referrer");
  });

  test("admin rejects unsupported and oversized files before FileReader", async ({ context, page }, testInfo) => {
    await installFileReaderProbe(page);
    await openAdminFlavorEditor(context, page, testInfo);

    const dialog = page.getByRole("dialog", { name: "Editar Item" });
    const input = dialog.locator('input[type="file"]');
    await input.setInputFiles({ name: "catalog.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await expect(dialog.getByRole("alert")).toContainText("Use uma imagem PNG, JPG ou WEBP.");
    expect(await fileReaderCount(page)).toBe(0);

    await input.setInputFiles({
      name: "catalog.png",
      mimeType: "image/png",
      buffer: Buffer.alloc(IMAGE_REFERENCE_LIMITS.maxBytes + 1, 0x41),
    });
    await expect(dialog.getByRole("alert")).toContainText("no máximo 2 MB");
    expect(await fileReaderCount(page)).toBe(0);
    await expect(dialog.getByText("PNG, JPG ou WEBP até 2 MB")).toBeVisible();
  });

  test("admin validates URL before committing external preview", async ({ context, page }, testInfo) => {
    await openAdminFlavorEditor(context, page, testInfo);
    const dialog = page.getByRole("dialog", { name: "Editar Item" });
    const urlInput = dialog.getByPlaceholder("Ou cole a URL da imagem (https://...)");

    await urlInput.fill("http://images.example.test/catalog.png");
    await urlInput.blur();
    await expect(dialog.getByRole("alert")).toContainText("URL HTTPS");
    await expect(urlInput).toHaveAttribute("aria-invalid", "true");
    await expect(dialog.getByAltText("Imagem Ilustrativa do Sabor")).toHaveCount(0);

    await urlInput.fill("https://images.example.test/catalog.png");
    await urlInput.blur();
    const preview = dialog.getByAltText("Imagem Ilustrativa do Sabor");
    await expect(preview).toBeVisible();
    await expect(preview).toHaveAttribute("referrerpolicy", "no-referrer");
  });
});
