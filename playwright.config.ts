import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.NINETY_E2E_BASE_URL;

if (!baseURL) {
  throw new Error("NINETY_E2E_BASE_URL is required. Point it at a NINETY Preview, never production.");
}
if (!/^https:\/\/feat-[a-z0-9-]+-live\.n90\.workers\.dev\/?$/i.test(baseURL)) {
  throw new Error("Security E2E tests are locked to feat-*-live.n90.workers.dev Preview URLs.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
});
