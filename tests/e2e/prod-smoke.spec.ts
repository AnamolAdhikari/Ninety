import { expect, test } from "@playwright/test";

type MatchApiItem = {
  home?: string;
  away?: string;
  date?: string;
  venueImage?: string;
};

type MatchApiResponse = { matches?: MatchApiItem[] };

const username = process.env.NINETY_E2E_USERNAME;
const password = process.env.NINETY_E2E_PASSWORD;

async function signIn(page: import("@playwright/test").Page) {
  if (!username || !password) throw new Error("Set NINETY_E2E_USERNAME and NINETY_E2E_PASSWORD before running authenticated E2E tests.");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await Promise.all([
    page.waitForURL(url => !url.pathname.startsWith("/auth"), { timeout: 15_000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await expect(page.getByText(/Featured fixtures/i)).toBeVisible({ timeout: 15_000 });
}

test.describe("NINETY access control", () => {
  test("anonymous match API is protected", async ({ request }) => {
    const response = await request.get("/api/matches");
    expect(response.status()).toBe(401);
  });
});

test.describe("NINETY authenticated production smoke", () => {
  test.beforeEach(async ({ page }) => { await signIn(page); });

  test("homepage loads authenticated matchday", async ({ page }) => {
    await expect(page.getByText(/Featured fixtures/i)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Authentication required");
  });

  test("authenticated match API is healthy and contains no exact duplicates", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/matches", { cache: "no-store" });
      return { status: response.status, body: await response.json() as MatchApiResponse };
    });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.matches)).toBeTruthy();
    expect(result.body.matches?.length ?? 0).toBeGreaterThan(0);
    const keys = (result.body.matches ?? []).map((m: MatchApiItem) => [m.home?.toLowerCase(), m.away?.toLowerCase(), m.date].join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("stadium assets resolve for mapped fixtures", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/matches", { cache: "no-store" });
      return response.json() as Promise<MatchApiResponse>;
    });
    const images = [...new Set((result.matches ?? []).map((m: MatchApiItem) => m.venueImage).filter((src): src is string => Boolean(src)))];
    test.skip(images.length === 0, "Current fixture window has no mapped stadium artwork.");
    for (const src of images.slice(0, 8)) {
      const response = await page.request.get(src);
      expect(response.ok(), src).toBeTruthy();
      expect(response.headers()["content-type"] || "", src).toMatch(/^image\//);
    }
  });

  test("last-good feed survives reload when match API fails", async ({ page }) => {
    const watchLinks = page.locator('a[href*="/watch?match="]');
    await expect.poll(async () => watchLinks.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const before = await watchLinks.count();

    await expect.poll(async () => page.evaluate(() => {
      const cached = sessionStorage.getItem("ninety-last-good-matches");
      if (!cached) return 0;
      try {
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    }), { timeout: 10_000 }).toBeGreaterThan(0);

    await page.route("**/api/matches", route => route.fulfill({
      status: 502,
      contentType: "application/json",
      body: '{"error":"test outage"}',
    }));

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(page.getByText(/Featured fixtures/i)).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => watchLinks.count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(before);
  });

  test("page has no horizontal overflow", async ({ page }) => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
