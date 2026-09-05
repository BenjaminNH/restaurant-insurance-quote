import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3107",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3107",
    url: "http://localhost:3107",
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium-mobile", use: { ...devices["Pixel 7"] } },
    {
      name: "webkit-iphone-17-pro",
      use: { ...devices["iPhone 15 Pro"], viewport: { width: 402, height: 874 } },
    },
    {
      name: "webkit-iphone-17-pro-max",
      use: { ...devices["iPhone 15 Pro Max"], viewport: { width: 440, height: 956 } },
    },
  ],
});
