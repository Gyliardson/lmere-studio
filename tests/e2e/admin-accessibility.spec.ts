import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/admin");
  await page.locator("#admin-slug").fill("ci-tenant-a");
  await page.locator("#admin-password").fill("ci-admin-password");
  await page.locator("#admin-login-btn").click();
  await expect(page.getByRole("heading", { name: "Gestão de Pedidos" })).toBeVisible();
}

async function openMenu(page: Page, testInfo: TestInfo) {
  if (testInfo.project.name.includes("mobile")) {
    await page.getByRole("button", { name: "Abrir menu do painel" }).click();
  }
  await page.getByRole("button", { name: "Cardápio", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gestao do Cardapio" })).toBeVisible();
}

test.describe("authenticated admin accessibility", () => {
  test("mobile navigation behaves as a modal drawer with Escape and focus restoration", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Mobile drawer only exists on the mobile project");
    await login(page);

    const trigger = page.getByRole("button", { name: "Abrir menu do painel" });
    await trigger.focus();
    await trigger.click();

    const drawer = page.getByRole("dialog", { name: "Navegação do painel" });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole("button", { name: "Fechar menu do painel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("edit dialog traps focus, closes with Escape and restores the invoking control", async ({ page }, testInfo) => {
    await login(page);
    await openMenu(page, testInfo);

    const editTrigger = page.getByRole("button", { name: "Editar CI Size A" });
    await editTrigger.click();

    const dialog = page.getByRole("dialog", { name: "Editar Item" });
    await expect(dialog).toBeVisible();
    const closeButton = page.getByRole("button", { name: "Fechar edição do item" });
    await expect(closeButton).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Salvar Alteracoes" })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(editTrigger).toBeFocused();
  });

  test("delete confirmation is a labelled modal and restores focus after Escape", async ({ page }, testInfo) => {
    await login(page);
    await openMenu(page, testInfo);

    const deleteTrigger = page.getByRole("button", { name: "Excluir CI Size A" });
    await deleteTrigger.click();
    const dialog = page.getByRole("dialog", { name: "Excluir Item" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "true");

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(deleteTrigger).toBeFocused();
  });

  test("custom select supports combobox keyboard navigation and Escape", async ({ page }, testInfo) => {
    await login(page);
    await openMenu(page, testInfo);
    await page.getByRole("tab", { name: /Massas & Recheios/ }).click();
    await page.getByRole("button", { name: "Editar CI Flavor A" }).click();

    const combo = page.getByRole("combobox", { name: /Categoria/ });
    await combo.focus();
    await page.keyboard.press("ArrowDown");
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(combo).toContainText("Recheio do Bolo");

    await page.keyboard.press("ArrowUp");
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(combo).toBeFocused();
  });

  test("admin image upload trigger is keyboard focusable", async ({ page }, testInfo) => {
    await login(page);
    await openMenu(page, testInfo);
    await page.getByRole("tab", { name: /Massas & Recheios/ }).click();
    await page.getByRole("button", { name: "Editar CI Flavor A" }).click();

    const uploadTrigger = page.getByRole("button", { name: /Clique ou arraste uma imagem/ });
    await uploadTrigger.focus();
    await expect(uploadTrigger).toBeFocused();
  });
});
