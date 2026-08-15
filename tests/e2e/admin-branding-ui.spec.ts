import { expect, test, type BrowserContext, type Page, type TestInfo } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "../../src/lib/admin-session";

async function openBranding(context: BrowserContext, page: Page, testInfo: TestInfo) {
  const tenantId = testInfo.project.name.includes("mobile") ? "ci-tenant-b" : "ci-tenant-a";
  await context.addCookies([
    {
      name: ADMIN_SESSION_COOKIE,
      value: createAdminSessionToken(tenantId),
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
  await page.getByRole("button", { name: "Marca & Estilo", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Marca & Personalizacao Visual" })).toBeVisible();
}

test("unsafe tenant palette is rejected with actionable recoverable admin feedback", async ({ context, page }, testInfo) => {
  await openBranding(context, page, testInfo);

  const background = page.getByRole("textbox", { name: "Cor de Fundo — hexadecimal" });
  const text = page.getByRole("textbox", { name: "Cor do Texto — hexadecimal" });
  const button = page.getByRole("textbox", { name: "Cor dos Botoes — hexadecimal" });

  const original = {
    background: await background.inputValue(),
    text: await text.inputValue(),
    button: await button.inputValue(),
  };

  await background.fill("#FFFFFF");
  await text.fill("#FFFFFF");
  await button.fill("#F5B7D2");
  await page.getByRole("button", { name: "Salvar Marca & Estilo" }).click();
  await expect(page.getByRole("status")).toContainText("texto e fundo precisam atingir contraste AA de 4.5:1");

  await background.fill("#000000");
  await text.fill("#FFFFFF");
  await button.fill("#000000");
  await page.getByRole("button", { name: "Salvar Marca & Estilo" }).click();
  await expect(page.getByRole("status")).toContainText("Estilo e Marca salvos com sucesso!");

  await background.fill(original.background);
  await text.fill(original.text);
  await button.fill(original.button);
  await page.getByRole("button", { name: "Salvar Marca & Estilo" }).click();
  await expect(page.getByRole("status")).toContainText("Estilo e Marca salvos com sucesso!");
});
