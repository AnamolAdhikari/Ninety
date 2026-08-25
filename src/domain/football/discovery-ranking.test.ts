import { describe, expect, it } from "vitest";
import type { Match } from "./types";
import { groupHomepageMatches, rankHomepageMatches } from "./discovery-ranking";

const now = new Date("2026-08-24T12:00:00Z");
const base: Match = { id: "base", slug: "a-v-b", competition: "Football", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-24T18:00:00Z", home: { id: "a", slug: "a", name: "A", shortName: "A", colors: ["#000", "#fff"] }, away: { id: "b", slug: "b", name: "B", shortName: "B", colors: ["#000", "#fff"] } };
const slug = (name: string) => name === "Premier League" ? "premier-league" : "football";

describe("homepage football ranking", () => {
  it("ranks playable, popular, and major live football deterministically", () => {
    const future = { ...base, id: "future" };
    const live = { ...base, id: "live", status: "LIVE" as const };
    const popular = { ...live, id: "popular", popular: true };
    const playable = { ...live, id: "playable", playableLive: true };
    const major = { ...live, id: "major", competition: "Premier League" };
    const ranked = rankHomepageMatches([future, live, popular, playable, major], now, slug).map((match) => match.id);
    expect(ranked[0]).toBe("playable");
    expect(ranked.indexOf("popular")).toBeLessThan(ranked.indexOf("live"));
    expect(ranked.indexOf("major")).toBeLessThan(ranked.indexOf("live"));
    expect(ranked.indexOf("live")).toBeLessThan(ranked.indexOf("future"));
    expect(rankHomepageMatches([live, live], now, slug).map((match) => match.id)).toEqual(["live", "live"]);
  });

  it("orders soonest kickoffs and assigns every fixture to only one section", () => {
    const matches: Match[] = [
      { ...base, id: "featured", status: "LIVE", playableLive: true },
      { ...base, id: "other-live", status: "LIVE" },
      { ...base, id: "soon-45", kickoff: "2026-08-24T12:45:00Z" },
      { ...base, id: "soon-10", kickoff: "2026-08-24T12:10:00Z" },
      { ...base, id: "today", kickoff: "2026-08-24T20:00:00Z" },
      { ...base, id: "future", kickoff: "2026-08-25T20:00:00Z" },
    ];
    const groups = groupHomepageMatches(matches, now, slug);
    expect(groups.featured?.id).toBe("featured");
    expect(groups.live.map((match) => match.id)).toEqual(["other-live"]);
    expect(groups.startingSoon.map((match) => match.id)).toEqual(["soon-10", "soon-45"]);
    expect(groups.today.map((match) => match.id)).toEqual(["today"]);
    expect(groups.upcoming.map((match) => match.id)).toEqual(["future"]);
    const ids = [groups.featured, ...groups.live, ...groups.startingSoon, ...groups.today, ...groups.upcoming].filter(Boolean).map((match) => match!.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
