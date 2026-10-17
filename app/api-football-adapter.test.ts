import { describe, expect, it } from "vitest";
import { apiFootballMatchSnapshot, normalizeApiFootballEvents } from "./api-football-adapter";

describe("API-Football normalization", () => {
  it("keeps only supported events and preserves missing values", () => {
    const events = normalizeApiFootballEvents([
      { type: "Goal", time: { elapsed: 12 }, player: { name: "Scorer" } },
      { type: "Unknown" },
    ]);
    expect(events).toEqual([{ minute: 12, extra: null, team: "", player: "Scorer", assist: "", type: "Goal", detail: "" }]);
  });

  it("creates a snapshot without inventing lineups, stats, or clock", () => {
    const snapshot = apiFootballMatchSnapshot({
      fixture: { id: 123, date: "2026-10-17T15:00:00Z", status: { short: "1H" } },
      teams: { home: { name: "Home" }, away: { name: "Away" } },
      goals: { home: 1, away: 0 },
    }, [], { provider: "API-Football", checkedAt: 1234, freshness: "stale" });
    expect(snapshot.score).toEqual({ home: 1, away: 0 });
    expect(snapshot.fixture.providerIds).toEqual({ "API-Football": 123 });
    expect(snapshot.events).toEqual([]);
    expect(snapshot.lineups).toBeNull();
    expect(snapshot.clock).toBeNull();
    expect(snapshot.statistics).toBeNull();
    expect(snapshot.sources.events?.freshness).toBe("stale");
  });

  it("preserves unknown scores as unavailable", () => {
    const snapshot = apiFootballMatchSnapshot({}, null, null);
    expect(snapshot.score).toBeNull();
    expect(snapshot.events).toBeNull();
    expect(snapshot.fixture.providerIds).toEqual({});
  });
});
