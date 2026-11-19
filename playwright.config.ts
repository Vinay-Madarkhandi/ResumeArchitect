import { randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd(), true);
const port = Number(process.env.E2E_PORT ?? 3217);
const fakePort = Number(process.env.FAKE_GEMINI_PORT ?? 4010);
const baseURL = `http://localhost:${port}`;
const adminEmail = process.env.E2E_ADMIN_EMAIL ??= `e2e-admin-${randomUUID()}@example.com`;

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [[ "list" ]],
  use: { baseURL, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 960 } } },
  ],
  webServer: [
    { command: "node e2e/fake-gemini.mjs", port: fakePort },
    {
      command: "npm run build:worker && npm run db:migrate && npm run build && node e2e/run-stack.mjs",
      url: `${baseURL}/api/health`,
      timeout: 300_000,
      env: {
        APP_URL: baseURL,
        ADMIN_EMAILS: [process.env.ADMIN_EMAILS, adminEmail].filter(Boolean).join(","),
        E2E_PORT: String(port),
        GEMINI_API_BASE_URL: `http://127.0.0.1:${fakePort}`,
        KEY_ENCRYPTION_SECRET: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
        RESEND_API_KEY: "",
        CLIPPER_EXTENSION_ORIGINS: "chrome-extension://abcdefghijklmnopabcdefghijklmnop",
      },
      gracefulShutdown: { signal: "SIGTERM", timeout: 5000 },
    },
  ],
});
