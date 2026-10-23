import { test, expect } from "@playwright/test";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
test("Firebase account confirmation, login, Firestore quote, admin proposal and password reset", async ({
  page,
}) => {
  const app = initializeApp({ projectId: "demo-sr-service" }, "test-auth");
  const adminAuth = getAuth(app);
  const email = `cliente-${Date.now()}@example.com`;
  const password = "SenhaSegura123!";
  const teamEmail = `equipe-${Date.now()}@example.com`;
  try {
    const team = await adminAuth.createUser({
      email: teamEmail,
      password,
      emailVerified: true,
    });
    await adminAuth.setCustomUserClaims(team.uid, { admin: true });
    await page.goto("/cadastro");
    await page
      .getByRole("textbox", { name: "Nome completo", exact: true })
      .fill("Cliente Firebase");
    await page
      .getByRole("textbox", { name: "Empresa", exact: true })
      .fill("Indústria Firebase");
    await page
      .getByRole("textbox", { name: "Telefone", exact: true })
      .fill("11999999999");
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("status")).toContainText("Conta criada");
    const oob = async (type) => {
      const response = await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-sr-service/oobCodes",
      );
      const json = await response.json();
      return json.oobCodes
        .filter((c) => c.email === email && c.requestType === type)
        .at(-1).oobCode;
    };
    const verifyCode = await oob("VERIFY_EMAIL");
    await page.goto(
      `/acao-email?mode=verifyEmail&oobCode=${encodeURIComponent(verifyCode)}`,
    );
    await expect(page.getByRole("status")).toContainText("E-mail confirmado");
    await page.getByRole("link", { name: "Voltar para o login" }).click();
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no portal" }).click();
    await expect(
      page.getByRole("heading", { name: /Olá, Cliente/ }),
    ).toBeVisible();
    await page.goto("/app/novo-orcamento?servico=pecas");
    await page
      .getByRole("textbox", { name: "Equipamento", exact: true })
      .fill("Talha Firebase");
    await page
      .getByRole("textbox", { name: "Descreva sua necessidade" })
      .fill(
        "Fornecimento de peças para manutenção da talha elétrica de teste.",
      );
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Endereço completo do atendimento" })
      .fill("Rua Industrial, 123, São Paulo, SP");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(
      page.getByRole("heading", { name: /Orçamento SR-/ }),
    ).toBeVisible();
    const quotePath = new URL(page.url()).pathname;
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(teamEmail);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no portal" }).click();
    await expect(
      page.getByRole("link", { name: "Todos os orçamentos", exact: true }),
    ).toBeVisible();
    await page.goto(quotePath);
    await page
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("Proposta enviada");
    await page
      .getByRole("spinbutton", { name: "Valor da proposta (R$)" })
      .fill("8500");
    await page.getByRole("button", { name: "Salvar atualização" }).click();
    await expect(page.locator(".page-heading .badge")).toHaveText(
      "Proposta enviada",
    );
    await expect(page.locator(".timeline li")).toHaveCount(2);
    await page.getByRole("button", { name: "Sair da conta" }).click();
    await page.goto("/recuperar-senha");
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(email);
    await page
      .getByRole("button", { name: "Enviar link de recuperação" })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "instruções de recuperação",
    );
    const resetCode = await oob("PASSWORD_RESET");
    await page.goto(
      `/acao-email?mode=resetPassword&oobCode=${encodeURIComponent(resetCode)}`,
    );
    await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
    await page
      .getByLabel("Confirmar senha", { exact: true })
      .fill("NovaSenha123!");
    await page.getByRole("button", { name: "Atualizar senha" }).click();
    await expect(page.getByRole("status")).toContainText("Senha atualizada");
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "E-mail", exact: true })
      .fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("NovaSenha123!");
    await page.getByRole("button", { name: "Entrar no portal" }).click();
    await expect(
      page.getByRole("heading", { name: /Olá, Cliente/ }),
    ).toBeVisible();
  } finally {
    await deleteApp(app);
  }
});
