import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://127.0.0.1:5173/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("link", { name: "Meu financeiro", exact: true }).click();
  await page
    .getByRole("button", { name: "Cadastrar conta", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nome da conta", { exact: true })
    .fill("Conta de demonstração");
  await dialog
    .getByLabel("Saldo anterior aos lançamentos (R$)", { exact: true })
    .fill("2500");
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).not.toBeVisible();
  for (const [kind, description, amount] of [
    ["Entrada", "Serviço recebido · demonstração", "1800"],
    ["Gasto", "Materiais · demonstração", "420"],
  ]) {
    await page.getByRole("button", { name: kind, exact: true }).click();
    dialog = page.getByRole("dialog");
    await dialog.getByLabel("Descrição", { exact: true }).fill(description);
    await dialog.getByLabel("Valor (R$)", { exact: true }).fill(amount);
    await dialog.getByRole("button", { name: "Salvar registro" }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.goto("http://127.0.0.1:5173/app/financeiro");
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "3.880,00",
  );
  await page.screenshot({
    path: "artifacts/finance-light-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("http://127.0.0.1:5173/app/configuracoes");
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.goto("http://127.0.0.1:5173/app/financeiro");
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "3.880,00",
  );
  await page.screenshot({
    path: "artifacts/finance-dark-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/finance-dark-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Gasto", exact: true }).click();
  await page.screenshot({
    path: "artifacts/finance-dark-form-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("http://127.0.0.1:5173/app");
  await page.getByRole("heading", { name: /Olá, Mariana/ }).waitFor();
  await page.screenshot({
    path: "artifacts/portal-dark-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sua operação, conectada." })
    .waitFor();
  await page.screenshot({
    path: "artifacts/login-dark-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
} finally {
  await browser.close();
}
