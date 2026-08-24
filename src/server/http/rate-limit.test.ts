import { describe, expect, it, vi } from "vitest";
import { enforceRateLimit } from "./rate-limit";

describe("Cloudflare rate limiting", () => {
  it("allows requests below the binding limit", async () => {
    const response = await enforceRateLimit(new Request("https://ninety.test/api/football/search"), "search", { limit: vi.fn(async () => ({ success: true })) });
    expect(response).toBeNull();
  });

  it("returns a normalized no-store 429 without provider details", async () => {
    const response = await enforceRateLimit(new Request("https://ninety.test/api/football/search"), "search", { limit: vi.fn(async () => ({ success: false })) });
    expect(response?.status).toBe(429);
    expect(response?.headers.get("retry-after")).toBe("60");
    expect(response?.headers.get("cache-control")).toBe("no-store");
    expect(response?.headers.get("x-request-id")).toBeTruthy();
    expect(await response?.json()).toEqual({ error: "Too many requests. Please try again shortly." });
  });
});
