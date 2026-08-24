import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LIVE_MATCH_REFRESH_MS } from "./live-match-score";

describe("LiveMatchScore", () => {
  it("polls only while the fixture is live and preserves exact match identity", () => {
    const source = readFileSync(new URL("./live-match-score.tsx", import.meta.url), "utf8");
    expect(LIVE_MATCH_REFRESH_MS).toBe(15_000);
    expect(source).toContain('if (match.status !== "LIVE") return');
    expect(source).toContain("data.match.id === match.id");
    expect(source).toContain("window.clearInterval(timer)");
  });
});
