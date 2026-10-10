import { expect, test } from "@playwright/test";

test.describe("NINETY production smoke", () => {
  test("homepage and match feed stay healthy", async ({ page }) => {
    const api = page.waitForResponse(r => r.url().includes("/api/matches") && r.request().method() === "GET");
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const response = await api;
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    expect(Array.isArray(payload.matches)).toBeTruthy();
    expect(payload.matches.length).toBeGreaterThan(0);
    await expect(page.locator("body")).toContainText(/Featured fixtures/i);
  });

  test("API feed contains no exact duplicate fixtures", async ({ request }) => {
    const response = await request.get("/api/matches");
    expect(response.ok()).toBeTruthy();
    const payload = await response.json();
    const matches = payload.matches ?? [];
    const keys = matches.map((m: any) => [m.home?.toLowerCase(), m.away?.toLowerCase(), m.date].join("|"));
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("featured stadium asset resolves when present", async ({ request }) => {
    const response = await request.get("/api/matches");
    const payload = await response.json();
    const featured = (payload.matches ?? []).find((m: any) => m.venueImage);
    expect(featured).toBeTruthy();
    const image = await request.get(featured.venueImage);
    expect(image.ok()).toBeTruthy();
    expect(image.headers()["content-type"] || "").toMatch(/^image\//);
  });

  test("last-good feed survives a later API failure", async ({ page }) => {
    let calls = 0;
    await page.route("**/api/matches", async route => {
      calls += 1;
      if (calls === 1) return route.continue();
      return route.fulfill({ status: 502, contentType: "application/json", body: '{"error":"test outage"}' });
    });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const firstCards = await page.locator('a[href*="/watch?match="]').count();
    expect(firstCards).toBeGreaterThan(0);
    await page.evaluate(() => fetch("/api/matches", { cache: "no-store" }).catch(() => null));
    await page.waitForTimeout(500);
    expect(await page.locator('a[href*="/watch?match="]').count()).toBeGreaterThan(0);
  });

  test("page has no horizontal overflow", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
