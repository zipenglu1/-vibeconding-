import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "../../tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:1420",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm dev -- --host 127.0.0.1 --port 1420",
    port: 1420,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
