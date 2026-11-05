import { describe, expect, it } from "vitest";
import { broadcastMatchesFixture, splitBroadcastTeams } from "../../lib/broadcast/match-fixture";

const kickoff = Date.UTC(2026, 10, 5, 20);
const fixture = { home: "Manchester United", away: "Manchester City", date: kickoff };
const event = (name: string, offset = 0) => ({ name, starts_at: kickoff / 1000 + offset });

describe("broadcast fixture matching", () => {
  it("matches exact names, aliases and reverse home/away", () => {
    expect(broadcastMatchesFixture(event("Man Utd vs Man City"), fixture)).toBe(true);
    expect(broadcastMatchesFixture(event("Manchester City vs Manchester United"), fixture)).toBe(true);
  });
  it("rejects unrelated teams and ambiguous substrings", () => {
    expect(broadcastMatchesFixture(event("Manchester United vs Liverpool"), fixture)).toBe(false);
    expect(broadcastMatchesFixture(event("Manchester United U21 vs Manchester City"), fixture)).toBe(false);
    expect(broadcastMatchesFixture(event("Real Madrid Castilla vs Barcelona"), {home:"Real Madrid",away:"Barcelona",date:kickoff})).toBe(false);
  });
  it("rejects wrong kickoff times and events without time", () => {
    expect(broadcastMatchesFixture(event("Man Utd vs Man City", 5401), fixture)).toBe(false);
    expect(broadcastMatchesFixture({name:"Man Utd vs Man City"}, fixture)).toBe(false);
  });
  it("parses only unambiguous versus names", () => {
    expect(splitBroadcastTeams("AC Milan vs Ferencvaros")).toEqual({home:"AC Milan",away:"Ferencvaros"});
    expect(splitBroadcastTeams("Football Highlights")).toBeNull();
  });
});
