import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { today } from "../../src/finance/domain.js";
async function login(page, email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("Finance123!");
  await page.getByRole("button", { name: "Entrar no portal" }).click();
  await expect(
    page.getByRole("heading", { name: /Olá, Sincronização/ }),
  ).toBeVisible();
  await page.goto("/app/financeiro");
}

test("incremental Firestore reads reduce documents without losing historical updates and refresh when tab returns", async ({
  page,
  context,
}) => {
  const app = initializeApp(
    { projectId: "demo-sr-service" },
    "incremental-integration",
  );
  try {
    const email = `sync-${Date.now()}@example.com`;
    const user = await getAuth(app).createUser({
      email,
      password: "Finance123!",
      emailVerified: true,
      displayName: "Sincronização Teste",
    });
    const store = getFirestore(app);
    const root = store.collection("users").doc(user.uid);
    const origin = Date.now() - 1000000;
    const meta = (i) => ({
      version: 1,
      created_at: Timestamp.fromMillis(origin + i),
      updated_at: Timestamp.fromMillis(origin + i),
    });
    await root
      .collection("accounts")
      .doc("bank")
      .set({ name: "Banco", type: "checking", opening_cents: 0, ...meta(0) });
    for (let offset = 0; offset < 600; offset += 300) {
      const batch = store.batch();
      for (let i = offset; i < offset + 300; i++)
        batch.set(
          root
            .collection("entries")
            .doc(`history-${String(i).padStart(4, "0")}`),
          {
            kind: "income",
            description: `Recebimento ${i}`,
            category: "Serviços",
            account_id: "bank",
            to_account_id: "",
            amount_cents: 100,
            date: today(),
            status: "paid",
            series_id: "",
            ...meta(i + 1),
          },
        );
      await batch.commit();
    }
    await login(page, email);
    await expect(
      page.locator(".finance-stats .stat-card").first(),
    ).toContainText("600,00");
    const measured = await page.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      const { financeRepository } = await import("/src/finance/repository.js");
      const repo = financeRepository({ id: authClient.currentUser.uid }, null);
      let data = await repo.load();
      const first = repo.getReadMetrics();
      await repo.load();
      const unchanged = repo.getReadMetrics();
      const previous = data.entries[0];
      await repo.save(
        "entries",
        previous.id,
        { ...previous, status: "void" },
        1,
        data.accounts,
      );
      await repo.createEntries(
        [
          {
            ...previous,
            id: "new-expense",
            kind: "expense",
            description: "Compra nova",
            amount_cents: 1000,
            series_id: "",
          },
        ],
        data.accounts,
      );
      data = await repo.load();
      const after = repo.getReadMetrics();
      return {
        initial: first.documents,
        unchanged: unchanged.documents - first.documents,
        changed: after.documents - unchanged.documents,
        entries: data.entries.length,
        cancelled: data.entries.filter((e) => e.status === "void").length,
      };
    });
    console.log("Firestore documents received:", JSON.stringify(measured));
    expect(measured).toEqual({
      initial: 601,
      unchanged: 2,
      changed: 4,
      entries: 601,
      cancelled: 1,
    });
    const second = await context.newPage();
    await second.goto("/app/financeiro");
    await expect(
      second.locator(".finance-stats .stat-card").first(),
    ).toContainText("589,00");
    await second.getByRole("button", { name: "Entrada", exact: true }).click();
    const d = second.getByRole("dialog");
    await d
      .getByLabel("Descrição", { exact: true })
      .fill("Entrada em outra aba");
    await d.getByLabel("Valor (R$)", { exact: true }).fill("5");
    await d.getByRole("button", { name: "Salvar registro" }).click();
    await expect(d).not.toBeVisible();
    await page.bringToFront();
    await expect(
      page.locator(".finance-stats .stat-card").first(),
    ).toContainText("594,00");
    await second.close();
  } finally {
    await deleteApp(app);
  }
});

test("100-row CSV import is atomic and idempotent against actual Firebase rules", async ({
  page,
  context,
}) => {
  const app = initializeApp(
    { projectId: "demo-sr-service" },
    "csv-integration",
  );
  try {
    const email = `csv-${Date.now()}@example.com`;
    await getAuth(app).createUser({
      email,
      password: "Finance123!",
      emailVerified: true,
      displayName: "Sincronização Importação",
    });
    await login(page, email);
    await page
      .getByRole("button", { name: "Cadastrar conta", exact: true })
      .click();
    let d = page.getByRole("dialog");
    await d
      .getByLabel("Nome da conta", { exact: true })
      .fill("Conta importação");
    await d.getByRole("button", { name: "Salvar registro" }).click();
    await expect(d).not.toBeVisible();
    const csv =
      "Data;Descrição;Categoria;Tipo;Situação;Valor (R$)\n" +
      Array.from(
        { length: 100 },
        (_, i) =>
          `${today()};Receita importada ${i};Serviços;Entrada;Realizado;1,00`,
      ).join("\n");
    async function analyze() {
      await page
        .getByRole("button", { name: "Importar CSV", exact: true })
        .click();
      d = page.getByRole("dialog");
      await d.getByLabel("Arquivo CSV", { exact: true }).setInputFiles({
        name: "dados.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(csv),
      });
      await d
        .getByRole("button", { name: "Analisar arquivo", exact: true })
        .click();
    }
    await analyze();
    await expect(d.getByRole("status")).toContainText("100 para importar");
    await context.setOffline(true);
    await expect(
      d.getByRole("button", {
        name: "Confirmar importação (100)",
        exact: true,
      }),
    ).toBeDisabled();
    await expect(d.getByRole("alert")).toContainText("Sem conexão");
    await context.setOffline(false);
    await d
      .getByRole("button", { name: "Confirmar importação (100)", exact: true })
      .click();
    await expect(d).not.toBeVisible();
    await page.reload();
    await expect(
      page.locator(".finance-stats .stat-card").first(),
    ).toContainText("100,00");
    await analyze();
    await expect(d.getByRole("status")).toContainText("100 já importado(s)");
    await expect(
      d.getByRole("button", { name: "Confirmar importação", exact: true }),
    ).toBeDisabled();
    const atomic = await page.evaluate(async () => {
      const { authClient } = await import("/src/firebase.js");
      const { financeRepository } = await import("/src/finance/repository.js");
      const repo = financeRepository({ id: authClient.currentUser.uid }, null);
      const data = await repo.load();
      const existing = data.entries[0];
      let rejected = false;
      try {
        await repo.createEntries(
          [
            { ...existing, id: "must-not-exist" },
            { ...existing, amount_cents: existing.amount_cents + 1 },
          ],
          data.accounts,
        );
      } catch (e) {
        rejected = e.message.includes("outros dados");
      }
      return {
        rejected,
        partial: (await repo.load()).entries.some(
          (e) => e.id === "must-not-exist",
        ),
      };
    });
    expect(atomic).toEqual({ rejected: true, partial: false });
  } finally {
    await deleteApp(app);
  }
});
