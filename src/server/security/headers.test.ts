import { describe, expect, it } from "vitest";
import { createSecurityHeaders } from "./headers";

describe("production security headers", () => {
  it("keeps CSP, browser hardening, and HSTS active", () => {
    const headers = new Map(createSecurityHeaders(true, ["https://player.example"], ["https://streamed.pk"]).map(({ key, value }) => [key.toLowerCase(), value]));
    expect(headers.get("content-security-policy")).toContain("frame-src 'self' https://player.example");
    expect(headers.get("content-security-policy")).not.toContain("frame-src *");
    expect(headers.get("referrer-policy")).toBe("no-referrer");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("permissions-policy")).toContain("camera=()");
    expect(headers.get("strict-transport-security")).toContain("max-age=31536000");
  });
});
