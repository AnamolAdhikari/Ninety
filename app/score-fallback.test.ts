import { describe, expect, it, vi, afterEach } from "vitest";
import { fallbackFinalScore } from "./score-fallback";

afterEach(() => vi.unstubAllGlobals());
const kickoff = Date.parse("2026-10-17T18:00:00Z");
const fixture = { strHomeTeam: "Arsenal", strAwayTeam: "Chelsea", dateEvent: "2026-10-17", intHomeScore: "2", intAwayScore: "1", strStatus: "Match Finished" };
const mock = (events: unknown[]) => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ event: events }) })));

describe("secondary provider final-score guardrails", () => {
  it("accepts one confirmed final score for the exact teams and day", async () => {
    mock([fixture]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toEqual({ home: 2, away: 1, source: "TheSportsDB" });
  });
  it("rejects live and scheduled scores", async () => {
    mock([{ ...fixture, strStatus: "In Progress" }]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toBeNull();
  });
  it("rejects duplicate exact pairings rather than choosing arbitrarily", async () => {
    mock([fixture, fixture]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toBeNull();
  });
  it("rejects a different match day", async () => {
    mock([{ ...fixture, dateEvent: "2026-10-16" }]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toBeNull();
  });
  it("rejects reversed teams and invalid scores", async () => {
    mock([{ ...fixture, strHomeTeam: "Chelsea", strAwayTeam: "Arsenal" }]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toBeNull();
    mock([{ ...fixture, intHomeScore: "-1" }]);
    expect(await fallbackFinalScore("Arsenal", "Chelsea", kickoff)).toBeNull();
  });
});
