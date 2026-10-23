import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
test("real Firebase financial writes survive reload, synchronize, reject stale edits and deduplicate retries", async ({
  page,
  context,
}) => {
  const app = initializeApp(
    { projectId: "demo-sr-service" },
    "finance-integration",
  );
  const email = `finance-${Date.now()}@example.com`;
  const password = "Finance123!";
  try {
    const accountUser = await getAuth(app).createUser({
      email,
      password,
      emailVerified: true,
      displayName: "Financeiro Teste",
    });
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no portal" }).click();
    await expect(
      page.getByRole("heading", { name: /Olá, Financeiro/ }),
    ).toBeVisible();
    await page.goto("/app/financeiro");
    await page
      .getByRole("button", { name: "Cadastrar conta", exact: true })
      .click();
    let d = page.getByRole("dialog");
    await d.getByLabel("Nome da conta", { exact: true }).fill("Conta Firebase");
    await d
      .getByLabel("Saldo anterior aos lançamentos (R$)", { exact: true })
      .fill("1000");
    await d.getByRole("button", { name: "Salvar registro" }).click();
    await expect(d).not.toBeVisible();
    await page.getByRole("button", { name: "Entrada", exact: true }).click();
    d = page.getByRole("dialog");
    await d
      .getByLabel("Descrição", { exact: true })
      .fill("Recebimento real emulado");
    await page.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      await authClient.currentUser.getIdToken(true);
    });
    await expect(d.getByLabel("Descrição", { exact: true })).toHaveValue(
      "Recebimento real emulado",
    );
    await d.getByLabel("Valor (R$)", { exact: true }).fill("250");
    await d.getByRole("button", { name: "Salvar registro" }).click();
    await expect(d).not.toBeVisible();
    await page.reload();
    await expect(
      page.locator(".finance-stats .stat-card").first(),
    ).toContainText("1.250,00");
    const persisted = await page.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      const { financeRepository } = await import("/src/finance/repository.js");
      const { today } = await import("/src/finance/domain.js");
      const repo = financeRepository({ id: authClient.currentUser.uid }, null);
      let data = await repo.load();
      const account = data.accounts[0];
      const payload = {
        kind: "expense",
        description: "Teste idempotente",
        category: "Outros",
        account_id: account.id,
        to_account_id: "",
        amount_cents: 1000,
        date: today(),
        status: "paid",
        series_id: "",
      };
      const rows = [{ ...payload, id: "same-operation" }];
      await repo.createEntries(rows, data.accounts);
      await repo.createEntries(rows, data.accounts);
      const series = {
        kind: "income",
        description: "Contrato recorrente",
        category: "Serviços",
        account_id: account.id,
        amount_cents: 10000,
        start_date: today(),
        end_date: "",
        frequency: "monthly",
        active: true,
      };
      await repo.save("series", "contract", series, 0, data.accounts);
      await repo.save(
        "series",
        "contract",
        { ...series, amount_cents: 20000 },
        1,
        data.accounts,
      );
      let conflict = false;
      try {
        await repo.save(
          "series",
          "contract",
          { ...series, amount_cents: 30000 },
          1,
          data.accounts,
        );
      } catch (e) {
        conflict = e.message.includes("Outro acesso");
      }
      data = await repo.load();
      return {
        payments: data.entries.filter((e) => e.id === "same-operation").length,
        conflict,
        amount: data.series[0].amount_cents,
      };
    });
    expect(persisted).toEqual({ payments: 1, conflict: true, amount: 20000 });
    await page.getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(
      page.locator(".finance-stats .stat-card").first(),
    ).toContainText("1.240,00");
    const second = await context.newPage();
    await second.goto("/app/financeiro");
    await expect(
      second.locator(".finance-stats .stat-card").first(),
    ).toContainText("1.240,00");
    await second.close();
    await page.goto("/app/configuracoes");
    await page.getByRole("button", { name: "Escuro", exact: true }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Claro", exact: true }).click();
    const quoteId = await page.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      const { createQuote } = await import("/src/firebase-data.js");
      const user = { id: authClient.currentUser.uid };
      const payload = {
        service: "Manutenção preventiva e corretiva",
        equipment: "Ponte rolante",
        description:
          "Solicitação de manutenção com inspeção de cabos e freios.",
        urgency: "Planejado",
        company: "Empresa Teste",
        contact_name: "Financeiro Teste",
        email: authClient.currentUser.email,
        phone: "11999998888",
        address: "Rua Teste, 100",
      };
      const operationId = user.id + "-retry";
      const first = await createQuote(user, payload, operationId);
      const retry = await createQuote(user, payload, operationId);
      if (first.id !== retry.id) throw new Error("Pedido duplicado");
      return first.id;
    });
    await getAuth(app).setCustomUserClaims(accountUser.uid, { admin: true });
    const quoteConflict = await page.evaluate(async (id) => {
      const { authClient } = await import("/src/firebase.js");
      const { getQuote, updateQuote } = await import("/src/firebase-data.js");
      await authClient.currentUser.getIdToken(true);
      const quote = await getQuote(id);
      await updateQuote(
        id,
        { status: "Em análise", amount: null, notes: "Primeira revisão" },
        quote.revision,
      );
      try {
        await updateQuote(
          id,
          { status: "Concluído", amount: null, notes: "Revisão desatualizada" },
          quote.revision,
        );
        return false;
      } catch (error) {
        return (
          error.message.includes("Outro acesso") &&
          (await getQuote(id)).notes === "Primeira revisão"
        );
      }
    }, quoteId);
    expect(quoteConflict).toBe(true);
  } finally {
    await deleteApp(app);
  }
});
test("Google Authentication emulator completes the actual popup flow", async ({
  page,
}) => {
  await page.goto("/login");
  const popupEvent = page.waitForEvent("popup", { timeout: 15000 });
  await page.getByRole("button", { name: "Continuar com Google" }).click();
  const popup = await popupEvent;
  await popup
    .getByRole("button", { name: "Add new account", exact: true })
    .click({ timeout: 15000 });
  await popup.locator("#email-input").fill(`google-${Date.now()}@example.com`);
  await popup.locator("#display-name-input").fill("Google Teste");
  await popup.getByRole("button", { name: /^Sign in with Google/ }).click();
  await expect(
    page.getByRole("heading", { name: /Olá, Google/ }),
  ).toBeVisible();
});
