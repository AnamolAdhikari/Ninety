import { expect, test } from "@playwright/test";

test.describe("NINETY security controls", () => {
  test("invalid credentials are rejected without exposing account details", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill("security-test");
    await page.getByLabel("Password").fill("definitely-not-a-real-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toContainText("Incorrect username or password.");
    await expect(page).toHaveURL(/\/auth\/login$/);
  });

  test("security headers are applied to unauthenticated responses", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();
    expect(headers["strict-transport-security"]).toContain("max-age=31536000");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  });

  test("unauthenticated admin API does not return admin data", async ({ request }) => {
    const response = await request.get("/api/admin/security");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Authentication required" });
  });

  test("unauthenticated admin page redirects to login", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()["location"]).toBe("/login");
  });
});

test.describe("authenticated authorization", () => {
  const friendUsername = process.env.NINETY_E2E_FRIEND_USERNAME;
  const friendPassword = process.env.NINETY_E2E_FRIEND_PASSWORD;

  test.skip(!friendUsername || !friendPassword, "Set NINETY_E2E_FRIEND_USERNAME and NINETY_E2E_FRIEND_PASSWORD to run friend authorization checks.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Username").fill(friendUsername!);
    await page.getByLabel("Password").fill(friendPassword!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("friend sees a normal 404 for the hidden admin page", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
    await expect(page.getByText(/owner access|required/i)).toHaveCount(0);

    const headers = response?.headers() ?? {};
    expect(headers["cache-control"]).toContain("no-store");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("no-referrer");
  });

  test("friend receives a non-revealing 404 from admin APIs", async ({ page }) => {
    const response = await page.request.get("/api/admin/security");
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe("");
    expect(response.headers()["cache-control"]).toContain("no-store");
  });

  test("friend presence updates are rate limited without exposing internals", async ({ page }) => {
    const statuses = await page.evaluate(async () => {
      const results: number[] = [];
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const response = await fetch("/api/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            match: "security-presence-test",
            visitor: "11111111-1111-4111-8111-111111111111",
            tab: "22222222-2222-4222-8222-222222222222",
          }),
        });
        results.push(response.status);
      }
      return results;
    });

    expect(statuses.slice(0, 5).every(status => status === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  test("friend session rejects CSRF, malformed requests, unsupported methods, and cookie tampering", async ({ page, context }) => {
    const csrf = await page.request.post("/api/telemetry", {
      headers: {
        Origin: "https://evil.example",
        "Content-Type": "application/json",
      },
      data: { event: "session-active", detail: {} },
    });
    expect(csrf.status()).toBe(403);
    expect(await csrf.text()).toBe("Forbidden");

    const unsupported = await page.request.delete("/api/telemetry");
    expect(unsupported.status()).toBe(405);

    const malformed = await page.evaluate(async () => {
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not-json",
      });
      return { status: response.status, body: await response.json() };
    });
    expect(malformed).toEqual({ status: 400, body: { error: "Invalid request" } });

    const oversized = await page.evaluate(async () => {
      const response = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ padding: "x".repeat(40_100) }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(oversized).toEqual({ status: 413, body: { error: "Request too large" } });

    const session = (await context.cookies()).find(cookie => cookie.name === "__Host-ninety-session");
    expect(session).toBeTruthy();
    expect(session?.httpOnly).toBe(true);
    expect(session?.secure).toBe(true);
    expect(session?.sameSite).toBe("Strict");

    const value = session!.value;
    const replacement = value.endsWith("0") ? "1" : "0";
    await context.addCookies([{ ...session!, value: value.slice(0, -1) + replacement }]);

    const tampered = await page.request.get("/api/account");
    expect(tampered.status()).toBe(401);
    expect(await tampered.json()).toEqual({ error: "Authentication required" });
  });
});


test("login rate limiter eventually returns 429 without leaking account details", async ({ request }) => {
  test.setTimeout(90_000);

  // Earlier authentication checks share Cloudflare's source-IP limiter.
  // Let the 60-second window expire, then exercise the limiter last so it
  // cannot make the authorization tests flaky.
  await new Promise(resolve => setTimeout(resolve, 65_000));

  let limited = false;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const response = await request.post("/auth/login", {
      headers: {
        Origin: process.env.NINETY_E2E_BASE_URL!,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: "username=rate-limit-test&password=not-a-real-password",
    });

    if (response.status() === 429) {
      limited = true;
      const body = await response.text();
      expect(body).toContain("Too many attempts");
      expect(body).not.toContain("rate-limit-test");
      break;
    }

    expect(response.status()).toBe(401);
  }

  expect(limited).toBe(true);
});
