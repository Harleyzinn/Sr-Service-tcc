import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/firebase-e2e",
  fullyParallel: false,
  timeout: 60000,
  use: { baseURL: "http://127.0.0.1:5174", headless: true },
  webServer: {
    command: "npm run dev -- --port 5174 --strictPort",
    url: "http://127.0.0.1:5174",
    reuseExistingServer: false,
    env: {
      VITE_FIREBASE_API_KEY: "demo-api-key",
      VITE_FIREBASE_PROJECT_ID: "demo-sr-service",
      VITE_FIREBASE_AUTH_DOMAIN: "demo-sr-service.firebaseapp.com",
      VITE_FIREBASE_APP_ID: "demo-app-id",
      VITE_FIREBASE_USE_EMULATORS: "true",
    },
  },
  reporter: "list",
});
