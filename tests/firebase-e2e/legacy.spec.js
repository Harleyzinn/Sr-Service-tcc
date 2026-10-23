import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

test("existing customers retain profile fields and original quote history after the upgrade", async ({
  page,
}) => {
  const app = initializeApp(
    { projectId: "demo-sr-service" },
    "legacy-compatibility",
  );
  try {
    const auth = getAuth(app),
      db = getFirestore(app);
    const email = `legacy-${Date.now()}@example.com`,
      password = "LegacySeguro123!";
    const customer = await auth.createUser({
      email,
      password,
      emailVerified: true,
    });
    await db
      .doc(`usuarios/${customer.uid}`)
      .set({
        uid: customer.uid,
        NOME_USU: "Cliente Anterior",
        EMAIL_USU: email,
        TEL_USU: "11988887777",
        CPF_CNPJ_USU: "",
        END_USU: "Rua Original, 100",
        admin: false,
      });
    await db
      .doc(`orcamentos/legacy-${customer.uid}`)
      .set({
        userUid: customer.uid,
        NOME_CONTATO: "Cliente Anterior",
        NOME_EMPRESA: "Empresa Original",
        EMAIL_CONTATO: email,
        TELEFONE_CONTATO: "11988887777",
        TIPO_SERVICO: "Serviço original preservado",
        DESCRICAO:
          "Descrição original do orçamento anterior preservada integralmente.",
        STATUS_ORCAMENTO: "Pendente",
        COD_ORCAMENTO: "123456",
        createdAt: Timestamp.now(),
      });
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Entrar no portal", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: /Olá, Cliente/ }),
    ).toBeVisible();
    await page.goto("/app/perfil");
    await expect(page.getByLabel("Nome completo", { exact: true })).toHaveValue(
      "Cliente Anterior",
    );
    await page.goto("/app/historico");
    await expect(
      page.getByRole("heading", { name: "Orçamento 123456", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Serviço original preservado", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Orçamento 123456", exact: true }),
    ).toBeVisible();
    expect(
      (await db.doc(`orcamentos/legacy-${customer.uid}`).get()).data()
        .STATUS_ORCAMENTO,
    ).toBe("Pendente");
    expect((await db.doc(`usuarios/${customer.uid}`).get()).data().admin).toBe(
      false,
    );
  } finally {
    await deleteApp(app);
  }
});
