import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real app, a local Supabase stack
 * (`npx supabase start`), and the fake Gemini server in e2e/fake-gemini.mjs.
 * The app must run with GEMINI_API_BASE_URL=http://127.0.0.1:4010.
 */
const PORT = Number(process.env.E2E_PORT ?? 3217);

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 960 } } },
  ],
  webServer: [
    { command: "node e2e/fake-gemini.mjs", port: 4010, reuseExistingServer: true },
    {
      command: `npx next dev -p ${PORT}`,
      port: PORT,
      reuseExistingServer: true,
      timeout: 180_000,
      env: { GEMINI_API_BASE_URL: "http://127.0.0.1:4010" },
    },
  ],
});
