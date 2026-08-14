import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const webServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
  ? {}
  : {
      webServer: {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
    };

export default defineConfig({
  testDir: "./tests/demo",
  outputDir: "test-results/demo",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    colorScheme: "dark",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  ...webServer,
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
