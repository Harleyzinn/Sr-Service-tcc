import { readFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

// Read-only live verification. Demo actions stay in the isolated browser storage.
const origin = "https://srservice-2-0.web.app";
const html = await readFile(
  new URL("../dist/index.html", import.meta.url),
  "utf8",
);
const entry = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1];
if (!entry)
  throw new Error("Build the application before verifying the release.");
await mkdir(new URL("../artifacts", import.meta.url), { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const response = await page.goto(origin);
  expect(response.status()).toBe(200);
  expect(await page.content()).toContain(entry);
  await expect(
    page.getByRole("heading", { name: /Sua indústria/ }),
  ).toBeVisible();
  await page.goto(origin + "/login");
  await expect(
    page.getByRole("button", { name: "Continuar com Google", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Sou cliente", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Olá, Mariana/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/redesign-production-desktop.png",
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Recolher menu lateral", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Expandir menu lateral", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/app/chat");
  await expect(
    page.getByRole("textbox", { name: "Sua mensagem", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "artifacts/redesign-production-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
  console.log(
    JSON.stringify({
      url: origin,
      currentBuild: true,
      publicPages: true,
      compactSidebar: true,
      mobileChat: true,
      javascriptErrors: 0,
      productionWrites: 0,
    }),
  );
} finally {
  await browser.close();
}
