import { test, expect } from "@playwright/test";

test("compact navigation persists, keeps accessible destinations and expands into the mobile drawer", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  const collapse = page.getByRole("button", {
    name: "Recolher menu lateral",
    exact: true,
  });
  await collapse.click();
  const expand = page.getByRole("button", {
    name: "Expandir menu lateral",
    exact: true,
  });
  await expect(expand).toHaveAttribute("aria-expanded", "false");
  const finance = page
    .getByRole("navigation", { name: "Menu do portal", exact: true })
    .getByRole("link", { name: "Meu financeiro", exact: true });
  await finance.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Financeiro", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Abrir menu do portal", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Navegação do portal" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Meu financeiro", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Navegação do portal" }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page
    .getByRole("button", { name: "Expandir menu lateral", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recolher menu lateral", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
});

test("important screens fit phone and tablet in both themes with reduced motion", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  for (const theme of ["Claro", "Escuro"]) {
    await page.goto("/app/configuracoes");
    await page.getByRole("button", { name: theme, exact: true }).click();
    for (const width of [360, 768]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const path of [
        "/app",
        "/app/orcamentos",
        "/app/orcamentos/demo-2",
        "/app/novo-orcamento",
        "/app/financeiro",
        "/app/chat",
        "/app/perfil",
        "/app/configuracoes",
        "/app/ajuda",
        "/app/historico",
      ]) {
        await page.goto(path);
        await expect(page.locator(".page-heading h1")).toBeVisible();
        await expect(
          page.getByText("Carregando…", { exact: true }),
        ).toHaveCount(0);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${theme} ${width}px ${path}`,
        ).toBe(true);
      }
    }
  }
});

test("public pages and every authentication form fit phone and tablet", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [360, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of [
      "/",
      "/sobre",
      "/servicos",
      "/contato",
      "/privacidade",
      "/login",
      "/cadastro",
      "/recuperar-senha",
      "/redefinir-senha",
      "/acao-email",
    ]) {
      await page.goto(path);
      await expect(page.getByText("Carregando…", { exact: true })).toHaveCount(
        0,
      );
      await expect(page.locator("h1").first()).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}px ${path}`,
      ).toBe(true);
    }
  }
});
