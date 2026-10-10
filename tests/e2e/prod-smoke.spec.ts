import { expect, test } from "@playwright/test";

type MatchApiItem = {
  id?: string;
  home?: string;
  away?: string;
  date?: number;
  live?: boolean;
  apiSources?: Array<{ source?: string; id?: string }>;
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
  test("anonymous APIs are protected and not cacheable", async ({ request }) => {
    for (const path of ["/api/matches", "/api/account", "/api/preferences"]) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(401);
      expect(response.headers()["cache-control"] || "", path).toContain("no-store");
    }
  });

  test("anonymous homepage redirects to private login", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()["location"]).toBe("/login");
    expect(response.headers()["cache-control"] || "").toContain("no-store");
  });

  test("login page carries private security headers", async ({ request }) => {
    const response = await request.get("/login");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"] || "").toContain("no-store");
    expect(response.headers()["content-security-policy"] || "").toContain("frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("NINETY session security", () => {
  test("cross-origin login POST is rejected", async ({ request }) => {
    const response = await request.post("/auth/login", {
      headers: {
        Origin: "https://example.com",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: "username=test&password=test",
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  });

  test("cross-origin logout POST is rejected", async ({ request }) => {
    const response = await request.post("/auth/logout", {
      headers: { Origin: "https://example.com" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(403);
  });

  test("malformed session cookie cannot unlock private APIs", async ({ request }) => {
    const response = await request.get("/api/account", {
      headers: { Cookie: "__Host-ninety-session=owner.invalid.invalid.invalid" },
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["cache-control"] || "").toContain("no-store");
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

    for (const match of result.body.matches ?? []) {
      expect(match.id).toBeTruthy();
      expect(match.home).toBeTruthy();
      expect(match.away).toBeTruthy();
      expect(Number.isFinite(match.date)).toBeTruthy();
      expect(Array.isArray(match.apiSources)).toBeTruthy();
      expect(match.venueImage).toMatch(/^\/stadiums\//);
      for (const source of match.apiSources ?? []) {
        expect(source.source).toBeTruthy();
        expect(source.id).toBeTruthy();
      }
    }
  });

  test("authenticated session cookie uses hardened browser flags", async ({ page }) => {
    const cookie = (await page.context().cookies()).find(item => item.name === "__Host-ninety-session");
    expect(cookie).toBeTruthy();
    expect(cookie?.httpOnly).toBeTruthy();
    expect(cookie?.secure).toBeTruthy();
    expect(cookie?.sameSite).toBe("Strict");
    expect(cookie?.path).toBe("/");
  });

  test("authenticated account boundary is private and identifies a role", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const response = await fetch("/api/account", { cache: "no-store" });
      return {
        status: response.status,
        cache: response.headers.get("cache-control"),
        body: await response.json() as { role?: string },
      };
    });
    expect(result.status).toBe(200);
    expect(result.cache || "").toContain("no-store");
    expect(["owner", "guest", "friend"]).toContain(result.body.role);
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

  test("last-good feed survives a failed match refresh", async ({ page }) => {
    test.setTimeout(90_000);
    const watchLinks = page.locator('a[href*="/watch?match="]');
    await expect.poll(async () => watchLinks.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const before = await watchLinks.count();

    await page.route("**/api/matches", route => route.fulfill({
      status: 502,
      contentType: "application/json",
      body: '{"error":"test outage"}',
    }));

    // Production refreshes the feed every 60 seconds. Keep the authenticated page
    // mounted and wait for that real refresh path rather than reloading the auth shell.
    await page.waitForTimeout(61_000);

    await expect(page.getByText(/Featured fixtures/i)).toBeVisible();
    await expect.poll(async () => watchLinks.count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(before);
  });

  test("cached matchday survives an immediate failed refresh", async ({ page }) => {
    const watchLinks = page.locator('a[href*="/watch?match="]');
    await expect.poll(async () => watchLinks.count(), { timeout: 15_000 }).toBeGreaterThan(0);
    const before = await watchLinks.count();

    await page.evaluate(() => {
      const cached = window.sessionStorage.getItem("ninety-last-good-matches");
      if (!cached) throw new Error("Expected last-good match cache after a successful feed load.");
    });

    await page.route("**/api/matches", route => route.fulfill({
      status: 502,
      contentType: "application/json",
      body: '{"error":"test outage"}',
    }));

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Featured fixtures/i)).toBeVisible({ timeout: 15_000 });
    await expect.poll(async () => watchLinks.count(), { timeout: 5_000 }).toBeGreaterThanOrEqual(before);
  });

  test("primary matchday controls stay inside the mobile viewport", async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes("mobile"), "Mobile viewport guard.");
    const result = await page.evaluate(() => {
      const viewport = document.documentElement.clientWidth;
      const selectors = ["header", "nav", "main", ".match-ticker"];
      return selectors.flatMap(selector =>
        [...document.querySelectorAll<HTMLElement>(selector)].map(element => {
          const rect = element.getBoundingClientRect();
          return { selector, left: rect.left, right: rect.right, width: rect.width, viewport };
        })
      );
    });
    for (const item of result) {
      expect(item.left, JSON.stringify(item)).toBeGreaterThanOrEqual(-2);
      expect(item.right, JSON.stringify(item)).toBeLessThanOrEqual(item.viewport + 2);
    }
  });

  test("page has no horizontal overflow", async ({ page }) => {
    const result = await page.evaluate(() => {
      const root = document.documentElement;
      const viewport = root.clientWidth;
      const offenders = [...document.querySelectorAll<HTMLElement>("body *")]
        .map(element => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === "string" ? element.className : "",
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          };
        })
        .filter(item => item.left < -2 || item.right > viewport + 2)
        .slice(0, 12);
      return { overflow: root.scrollWidth - viewport, viewport, offenders };
    });
    expect(result.overflow, JSON.stringify(result)).toBeLessThanOrEqual(2);
  });
});
