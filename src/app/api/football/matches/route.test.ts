import { describe, expect, it } from "vitest";
import { createMatchesHandler, scheduleCacheControl } from "./route";

describe("GET /api/football/matches", () => {
  it("uses one prepared schedule result and state-aware caching", async () => {
    let calls = 0;
    const data = { date: "2026-08-24", matches: [], competitions: [], groups: [] };
    const response = await createMatchesHandler({ getMatchSchedule: async () => { calls += 1; return data; } })(data.date);
    expect(calls).toBe(1);
    expect(await response.json()).toEqual(data);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
  });
  it("varies cache lifetime by fixture state", () => {
    expect(scheduleCacheControl([{ status: "LIVE" }])).toContain("s-maxage=15");
    expect(scheduleCacheControl([{ status: "UPCOMING" }])).toContain("s-maxage=60");
    expect(scheduleCacheControl([{ status: "FINISHED" }])).toContain("s-maxage=300");
  });
});
