import { describe, expect, it } from "vitest";
import { createDashboardHandler } from "./route";

describe("GET /api/football/dashboard", () => {
  it("returns normalized dashboard data with short-lived caching", async () => {
    const data = { generatedAt: "2026-08-23T00:00:00.000Z", featured: null, live: [], today: [], upcoming: [], matches: [], competitions: [] };
    const response = await createDashboardHandler({ getDashboard: async () => data })();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=15");
    expect(await response.json()).toEqual(data);
  });

  it("returns a stable error shape without upstream details", async () => {
    const response = await createDashboardHandler({ getDashboard: async () => { throw new Error("https://secret-provider.test/token"); } })();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Football data is temporarily unavailable." } });
  });
});
