import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto("http://127.0.0.1:5173/app/chat");
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Sua mensagem", exact: true })
    .fill(
      "Olá! Gostaria de acompanhar o orçamento da manutenção da nossa ponte rolante.\nPosso enviar mais informações por aqui?",
    );
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(page.locator(".chat-message")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Visão da equipe", exact: true })
    .click();
  await page.getByRole("link", { name: "Conversas", exact: true }).click();
  await page
    .locator(".chat-inbox-list button")
    .filter({ hasText: "Mariana Oliveira" })
    .click();
  await page
    .getByRole("textbox", { name: "Sua mensagem", exact: true })
    .fill(
      "Olá, Mariana! Sim, você pode detalhar sua necessidade por aqui.\nInforme o modelo do equipamento e a referência do orçamento para continuarmos o atendimento.",
    );
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "artifacts/chat-admin-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  await page
    .getByRole("link", { name: "Chat com a equipe", exact: true })
    .click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "artifacts/chat-customer-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Preferências", exact: true }).click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await page
    .getByRole("link", { name: "Chat com a equipe", exact: true })
    .click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "artifacts/chat-customer-mobile-dark.png",
    fullPage: true,
    animations: "disabled",
  });
} finally {
  await browser.close();
}
