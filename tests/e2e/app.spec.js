import { test, expect } from "@playwright/test";
test("public pages, protected routes, legacy URLs and 404", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Sua indústria/ }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Sobre nós" })
    .click();
  await expect(
    page.getByRole("heading", { name: /Mais que equipamentos/ }),
  ).toBeVisible();
  await page.goto("/servicos");
  await page.getByRole("textbox", { name: "Buscar serviço" }).fill("Peças");
  await expect(
    page.getByRole("heading", { name: "Peças e componentes", exact: true }),
  ).toBeVisible();
  await page.goto("/app/novo-orcamento");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/perfil.html");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/nao-existe");
  await expect(
    page.getByRole("heading", { name: "Esse caminho não existe." }),
  ).toBeVisible();
});
test("customer submits quote, searches it, sees history and edits profile", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await expect(
    page.getByRole("heading", { name: /Olá, Mariana/ }),
  ).toBeVisible();
  await page
    .getByRole("main")
    .getByRole("link", { name: "Novo orçamento", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Tipo de serviço" })
    .selectOption("Manutenção preventiva e corretiva");
  await page
    .getByRole("textbox", { name: "Equipamento", exact: true })
    .fill("Ponte E2E 12 toneladas");
  await page
    .getByRole("textbox", { name: "Descreva sua necessidade" })
    .fill(
      "Precisamos avaliar os freios e o sistema de elevação do equipamento.",
    );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(
    page.getByRole("heading", { name: /Orçamento SR-1049/ }),
  ).toBeVisible();
  await expect(
    page.getByText("Ponte E2E 12 toneladas", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Histórico do atendimento" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar aos orçamentos" }).click();
  await page
    .getByRole("textbox", { name: "Buscar orçamento" })
    .fill("Ponte E2E");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Meu perfil", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nome completo" })
    .fill("Mariana Silva");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Perfil de demonstração/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Nome completo" }),
  ).toHaveValue("Mariana Silva");
  await page.goto("/app/clientes");
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test("admin updates status and proposal; filters and history reflect it", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Visão da equipe" }).click();
  await page
    .getByRole("link", { name: "Todos os orçamentos", exact: true })
    .click();
  await page.getByRole("link", { name: "SR-1048", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("Aprovado");
  await page
    .getByRole("spinbutton", { name: "Valor da proposta (R$)" })
    .fill("8500");
  await page
    .getByRole("textbox", { name: "Observações visíveis ao cliente" })
    .fill(
      "Avaliação técnica e substituição de componentes. Proposta válida por 15 dias.",
    );
  await page.getByRole("button", { name: "Salvar atualização" }).click();
  await expect(page.locator(".page-heading .badge")).toHaveText("Aprovado");
  await expect(page.locator(".timeline li").first()).toContainText("Aprovado");
  await page.getByRole("link", { name: "Voltar aos orçamentos" }).click();
  await page
    .getByRole("combobox", { name: "Filtrar por status" })
    .selectOption("Aprovado");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Indústria Horizonte");
});
test("auth forms give honest configuration feedback and recovery navigation", async ({
  page,
}) => {
  await page.goto("/login");
  await page
    .getByRole("textbox", { name: "E-mail", exact: true })
    .fill("teste@example.com");
  await page.getByLabel("Senha", { exact: true }).fill("senha-teste");
  await page.getByRole("button", { name: "Entrar no portal" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "configuração do Firebase",
  );
  await page.getByRole("link", { name: "Esqueci minha senha" }).click();
  await expect(
    page.getByRole("heading", { name: "Esqueceu sua senha?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar para o login" }).click();
  await page.getByRole("link", { name: "Criar conta", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Vamos começar?" }),
  ).toBeVisible();
});
test("mobile layouts fit viewport and portal menu works", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    "/",
    "/sobre",
    "/servicos",
    "/contato",
    "/login",
    "/cadastro",
    "/privacidade",
  ]) {
    await page.goto(path);
    await expect(page.locator("body")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.getByRole("button", { name: "Abrir menu do portal" }).click();
  await page
    .getByRole("link", { name: "Meus orçamentos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meus orçamentos" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("quote validation preserves typed data across steps and blocks invalid contact", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente" }).click();
  await page.goto("/app/novo-orcamento?servico=pecas");
  await expect(
    page.getByRole("combobox", { name: "Tipo de serviço" }),
  ).toHaveValue("Peças e componentes");
  await page
    .getByRole("textbox", { name: "Equipamento", exact: true })
    .fill("Talha de teste");
  await page
    .getByRole("textbox", { name: "Descreva sua necessidade" })
    .fill("Fornecimento do conjunto de freios para talha de cinco toneladas.");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("textbox", { name: "Telefone com DDD" }).fill("123");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("telefone com DDD");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Equipamento", exact: true }),
  ).toHaveValue("Talha de teste");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Telefone com DDD" }),
  ).toHaveValue("123");
});
