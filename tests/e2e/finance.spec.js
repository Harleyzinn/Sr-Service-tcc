import { test, expect } from "@playwright/test";
import { today } from "../../src/finance/domain.js";
import { readFile } from "node:fs/promises";
async function account(page, name, opening, first = false) {
  await page
    .getByRole("button", {
      name: first ? "Cadastrar conta" : "Nova conta",
      exact: true,
    })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nome da conta", { exact: true }).fill(name);
  await dialog
    .getByLabel("Saldo anterior aos lançamentos (R$)", { exact: true })
    .fill(opening);
  await dialog.getByRole("button", { name: "Salvar registro" }).click();
  await expect(dialog).not.toBeVisible();
}
async function entry(page, kind, description, amount) {
  await page.getByRole("button", { name: kind, exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Descrição", { exact: true }).fill(description);
  await d.getByLabel("Valor (R$)", { exact: true }).fill(amount);
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
}
test("financial ledger persists payments, conserves transfers, handles recurrence and planning", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("link", { name: "Meu financeiro", exact: true }).click();
  await account(page, "Caixa", "1000", true);
  await entry(page, "Entrada", "Serviço recebido", "200");
  await entry(page, "Gasto", "Compra de materiais", "50");
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "1.150,00",
  );
  await page.reload();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "1.150,00",
  );
  await page.getByRole("button", { name: "Contas", exact: true }).click();
  await account(page, "Banco", "0");
  await page.getByRole("button", { name: "Transferir entre contas" }).click();
  let d = page.getByRole("dialog");
  await d
    .getByLabel("Descrição", { exact: true })
    .fill("Transferência interna");
  await d.getByLabel("Valor (R$)", { exact: true }).fill("100");
  await d
    .getByRole("combobox", { name: "Conta de origem" })
    .selectOption({ label: "Caixa" });
  await d
    .getByRole("combobox", { name: "Conta de destino" })
    .selectOption({ label: "Banco" });
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  await page
    .getByRole("button", { name: "Visão financeira", exact: true })
    .click();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "1.150,00",
  );
  await page.getByRole("button", { name: "Recorrências", exact: true }).click();
  await page.getByRole("button", { name: "Nova recorrência" }).click();
  d = page.getByRole("dialog");
  await d.getByRole("button", { name: "Entrada", exact: true }).click();
  await d.getByLabel("Descrição", { exact: true }).fill("Receita recorrente");
  await d.getByLabel("Valor (R$)", { exact: true }).fill("500");
  await d.getByLabel("Primeira ocorrência", { exact: true }).fill(today());
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  await page.getByRole("button", { name: "Lançamentos", exact: true }).click();
  const recurring = page
    .locator(".finance-entry")
    .filter({ hasText: "Receita recorrente" });
  await expect(recurring).toContainText("Previsão de recorrência");
  await recurring
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(recurring).toContainText("Realizado");
  await page.reload();
  await expect(
    page.locator(".finance-entry").filter({ hasText: "Receita recorrente" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Visão financeira", exact: true })
    .click();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "1.650,00",
  );
  await page.getByRole("button", { name: "Planejamento", exact: true }).click();
  await page.getByRole("button", { name: "Novo limite" }).click();
  d = page.getByRole("dialog");
  await d.getByLabel("Limite mensal (R$)", { exact: true }).fill("40");
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Uso do limite de Outros" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nova meta" }).click();
  d = page.getByRole("dialog");
  await d
    .getByLabel("Nome da meta", { exact: true })
    .fill("Reserva de emergência");
  await d.getByLabel("Objetivo (R$)", { exact: true }).fill("1000");
  await d.getByLabel("Já reservado (R$)", { exact: true }).fill("200");
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("progressbar", {
      name: "Progresso de Reserva de emergência",
    }),
  ).toHaveAttribute("value", "20000");
  await page
    .getByRole("button", { name: "Visão financeira", exact: true })
    .click();
  await expect(page.locator(".finance-alerts")).toContainText("125% do limite");
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "1.650,00",
  );
});
test("theme and widgets persist and finance remains usable on mobile without overflowing", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("link", { name: "Preferências", exact: true }).click();
  await page.getByRole("button", { name: "Escuro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("checkbox", { name: "Evolução mensal", exact: true })
    .uncheck();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("checkbox", { name: "Evolução mensal", exact: true }),
  ).not.toBeChecked();
  await page.goto("/app/financeiro");
  await expect(page.locator(".finance-chart")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await account(page, "Conta móvel", "10", true);
  await entry(page, "Gasto", "Despesa móvel", "1");
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "9,00",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/app/configuracoes");
  await page.getByRole("button", { name: "Claro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("installments preserve cents, cancellation is reversible and exports contain persisted records", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("link", { name: "Meu financeiro", exact: true }).click();
  await account(page, "Caixa parcelado", "100", true);
  await page.getByRole("button", { name: "Gasto", exact: true }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Descrição", { exact: true }).fill("Ferramenta parcelada");
  await d.getByLabel("Valor (R$)", { exact: true }).fill("100,01");
  await d.locator("summary").click();
  await d.getByLabel("Número de parcelas", { exact: true }).fill("3");
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "66,66",
  );
  await page.getByRole("button", { name: "Lançamentos", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Cancelar Ferramenta parcelada (1/3)",
      exact: true,
    })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar cancelamento" })
    .click();
  await expect(page.locator(".finance-entry").first()).toContainText(
    "Cancelado",
  );
  await page.getByRole("button", { name: "Restaurar previsão" }).click();
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(page.locator(".finance-entry").first()).toContainText(
    "Realizado",
  );
  await page.reload();
  await expect(page.locator(".finance-entry").first()).toContainText(
    "Realizado",
  );
  await page.getByRole("button", { name: "Contas", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar dados em JSON" }).click();
  const download = await downloadEvent;
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(data.schema).toBe(1);
  expect(data.accounts).toHaveLength(1);
  expect(data.entries).toHaveLength(3);
  expect(data.entries.reduce((n, e) => n + e.amount_cents, 0)).toBe(10001);
  expect(data.entries.filter((e) => e.status === "paid")).toHaveLength(1);
});
