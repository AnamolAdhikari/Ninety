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
  });

  test("friend receives a non-revealing 404 from admin APIs", async ({ page }) => {
    const response = await page.request.get("/api/admin/security");
    expect(response.status()).toBe(404);
    expect(await response.text()).toBe("");
  });
});
