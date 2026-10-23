import { test, expect } from "@playwright/test";
import { today } from "../../src/finance/domain.js";
async function start(page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("link", { name: "Meu financeiro", exact: true }).click();
  await page
    .getByRole("button", { name: "Cadastrar conta", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Nome da conta", { exact: true }).fill("Conta CSV");
  await d
    .getByLabel("Saldo anterior aos lançamentos (R$)", { exact: true })
    .fill("100");
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
}
async function analyze(page, csv) {
  await page.getByRole("button", { name: "Importar CSV", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Arquivo CSV", { exact: true }).setInputFiles({
    name: "movimentos.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  await d
    .getByRole("button", { name: "Analisar arquivo", exact: true })
    .click();
  return d;
}
const header = "Data;Descrição;Categoria;Tipo;Situação;Valor (R$)\n";
test("CSV validation blocks partial import, valid files persist and retries do not duplicate on mobile", async ({
  page,
}) => {
  await start(page);
  await page.setViewportSize({ width: 390, height: 844 });
  let d = await analyze(
    page,
    header +
      `${today()};Material válido;Outros;Gasto;Realizado;10,50\n2026-02-31;Data incorreta;Outros;Gasto;Previsto;4`,
  );
  await expect(d.getByRole("alert")).toContainText("Nenhum foi gravado");
  await expect(
    d.getByRole("button", { name: /Confirmar importação/ }),
  ).toBeDisabled();
  await d
    .getByLabel("Arquivo CSV", { exact: true })
    .setInputFiles({
      name: "encoding.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([0xff, 0xfe, 0x41]),
    });
  await d
    .getByRole("button", { name: "Analisar arquivo", exact: true })
    .click();
  await expect(d.getByRole("alert")).toContainText("não está em UTF-8");
  await d.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "100,00",
  );
  const csv =
    header +
    `${today()};Material válido;Outros;Gasto;Realizado;10,50\n2099-01-01;Entrada futura;Serviços;Entrada;Previsto;25`;
  d = await analyze(page, csv);
  await expect(d.getByRole("status")).toContainText("2 para importar");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await d
    .getByRole("button", { name: "Confirmar importação (2)", exact: true })
    .click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "89,50",
  );
  await page.reload();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "89,50",
  );
  d = await analyze(page, csv);
  await expect(d.getByRole("status")).toContainText("2 já importado(s)");
  await expect(
    d.getByRole("button", { name: "Confirmar importação", exact: true }),
  ).toBeDisabled();
});

test("CSV flags manual similarities, requires explicit inclusion and supplies a downloadable template", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "Gasto", exact: true }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Descrição", { exact: true }).fill("Compra semelhante");
  await d.getByLabel("Valor (R$)", { exact: true }).fill("10");
  await d.getByRole("button", { name: "Salvar registro" }).click();
  await expect(d).not.toBeVisible();
  d = await analyze(
    page,
    header + `${today()};Compra semelhante;Outros;Gasto;Realizado;10`,
  );
  await expect(d.getByRole("status")).toContainText("0 para importar");
  await expect(
    d.getByRole("button", { name: "Confirmar importação", exact: true }),
  ).toBeDisabled();
  const templateEvent = page.waitForEvent("download");
  await d
    .getByRole("button", { name: "Baixar modelo CSV", exact: true })
    .click();
  expect((await templateEvent).suggestedFilename()).toBe(
    "modelo-financeiro-sr-service.csv",
  );
  await d
    .getByRole("checkbox", {
      name: "Incluir lançamentos semelhantes",
      exact: true,
    })
    .check();
  await expect(d.getByRole("status")).toContainText("1 para importar");
  await d
    .getByRole("button", { name: "Confirmar importação (1)", exact: true })
    .click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "80,00",
  );
});

test("import preview must be reviewed again after another access changes the ledger", async ({
  page,
}) => {
  await start(page);
  const d = await analyze(
    page,
    header + `${today()};Compra a conferir;Outros;Gasto;Realizado;10`,
  );
  await expect(d.getByRole("status")).toContainText("1 para importar");
  await page.evaluate(async () => {
    const { financeRepository } = await import("/src/finance/repository.js");
    const { demoProfile } = await import("/src/api.js");
    const { today } = await import("/src/finance/domain.js");
    const repo = financeRepository(demoProfile("customer"), "customer");
    const data = await repo.load();
    await repo.createEntries(
      [
        {
          id: "another-access",
          kind: "income",
          description: "Recebimento em outro acesso",
          category: "Serviços",
          account_id: data.accounts[0].id,
          to_account_id: "",
          amount_cents: 500,
          date: today(),
          status: "paid",
          series_id: "",
        },
      ],
      data.accounts,
    );
  });
  await expect(d.getByRole("alert")).toContainText(
    "Os lançamentos foram atualizados",
  );
  await expect(
    d.getByRole("button", { name: "Confirmar importação", exact: true }),
  ).toBeDisabled();
  await d
    .getByRole("button", { name: "Analisar arquivo", exact: true })
    .click();
  await expect(d.getByRole("status")).toContainText("1 para importar");
  await d.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator(".finance-stats .stat-card").first()).toContainText(
    "105,00",
  );
});
