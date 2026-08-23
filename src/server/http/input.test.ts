import { describe, expect, it } from "vitest";
import { isSafeOpaqueId, isSafeSlug, isValidIsoDate, normalizeSearchQuery } from "./input";
describe("public input validation", () => {
  it("rejects impossible dates and unsafe identifiers", () => { expect(isValidIsoDate("2026-02-29")).toBe(false); expect(isValidIsoDate("2026-08-23")).toBe(true); expect(isSafeSlug("premier-league")).toBe(true); expect(isSafeSlug("../secret")).toBe(false); expect(isSafeOpaqueId("match-abc123")).toBe(true); });
  it("bounds and normalizes search queries", () => expect(normalizeSearchQuery(`  arsenal   ${"x".repeat(100)}`)).toHaveLength(80));
});
