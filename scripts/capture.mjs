import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.screenshot({ path: "artifacts/home-desktop.png", fullPage: true });
await page.goto("http://127.0.0.1:5173/login", { waitUntil: "networkidle" });
await page.screenshot({ path: "artifacts/login-desktop.png", fullPage: true });
await page.getByRole("button", { name: "Sou cliente" }).click();
await page.getByRole("heading", { name: /Olá, Mariana/ }).waitFor();
await page.screenshot({ path: "artifacts/portal-desktop.png", fullPage: true });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "artifacts/portal-mobile.png",
  fullPage: true,
  animations: "disabled",
});
await browser.close();
