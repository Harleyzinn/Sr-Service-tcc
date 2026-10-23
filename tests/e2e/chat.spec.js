import { test, expect } from "@playwright/test";
test("customer and admin demo chat preserves messages across reloads and role changes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("link", { name: "Abrir chat com a equipe", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chat com a equipe", exact: true }),
  ).toBeVisible();
  const composer = page.getByRole("textbox", {
    name: "Sua mensagem",
    exact: true,
  });
  await composer.fill("Preciso de ajuda com uma manutenção.");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "Preciso de ajuda com uma manutenção.",
  );
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "Preciso de ajuda com uma manutenção.",
  );
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
  await expect(page.getByRole("log")).toContainText(
    "Preciso de ajuda com uma manutenção.",
  );
  await page
    .getByRole("textbox", { name: "Sua mensagem", exact: true })
    .fill("Olá! Informe o modelo do equipamento.");
  await page
    .getByRole("button", { name: "Enviar mensagem", exact: true })
    .click();
  await expect(page.getByRole("log")).toContainText(
    "Olá! Informe o modelo do equipamento.",
  );
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "Olá! Informe o modelo do equipamento.",
  );
  await page
    .getByRole("button", { name: "Sair da conta", exact: true })
    .click();
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  await page
    .getByRole("link", { name: "Chat com a equipe", exact: true })
    .click();
  await expect(page.locator(".chat-message")).toHaveCount(2);
  await expect(page.getByRole("log")).toContainText(
    "Olá! Informe o modelo do equipamento.",
  );
});
test("mobile chat renders text safely, validates whitespace and supports keyboard sending", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/chat");
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  const input = page.getByRole("textbox", {
    name: "Sua mensagem",
    exact: true,
  });
  await input.fill(" \n ");
  await expect(
    page.getByRole("button", { name: "Enviar mensagem", exact: true }),
  ).toBeDisabled();
  const text =
    '<img src=x onerror="window.chatInjected=true">\nTexto preservado.';
  await input.fill(text);
  await input.press("Control+Enter");
  await expect(page.getByRole("log")).toContainText(text);
  expect(await page.evaluate(() => Boolean(window.chatInjected))).toBe(false);
  await expect(page.locator(".chat-message img")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.reload();
  await expect(page.getByRole("log")).toContainText(text);
});
