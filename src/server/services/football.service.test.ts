import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import { FootballService } from "./football.service";

const base: Match = { id: "base", slug: "a-v-b", competition: "Premier League", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T12:00:00Z", home: { id: "a", slug: "a", name: "A", shortName: "A", colors: ["#000", "#fff"] }, away: { id: "b", slug: "b", name: "B", shortName: "B", colors: ["#000", "#fff"] } };

describe("FootballService", () => {
  it("deduplicates and sorts live, today, and upcoming matches", async () => {
    const matches: Match[] = [{ ...base, id: "later", kickoff: "2026-08-23T15:00:00Z" }, { ...base, id: "live-low", status: "LIVE", kickoff: "2026-08-23T10:00:00Z" }, { ...base, id: "live-popular", status: "LIVE", popular: true, kickoff: "2026-08-23T11:00:00Z" }, { ...base, id: "later", kickoff: "2026-08-23T15:00:00Z" }];
    const dashboard = await new FootballService({ getMatches: async () => matches }, () => new Date("2026-08-23T09:00:00Z")).getDashboard();
    expect(dashboard.live.map((match) => match.id)).toEqual(["live-popular", "live-low"]);
    expect(dashboard.today.map((match) => match.id)).toEqual(["live-low", "live-popular", "later"]);
    expect(dashboard.upcoming.map((match) => match.id)).toEqual(["later"]);
    expect(dashboard.featured?.id).toBe("live-popular");
  });

  it("supports a completely empty provider response", async () => {
    const dashboard = await new FootballService({ getMatches: async () => [] }).getDashboard();
    expect(dashboard.featured).toBeNull();
    expect(dashboard.matches).toEqual([]);
  });

  it("resolves only exact NINETY match IDs and builds related matches", async () => {
    const matches: Match[] = [base, { ...base, id: "related", slug: "c-v-d" }];
    const service = new FootballService({ getMatches: async () => matches });
    expect((await service.getMatchById("base"))?.slug).toBe("a-v-b");
    expect(await service.getMatchById("provider-source-id")).toBeNull();
    expect((await service.getMatchCenter("base"))?.related.map((match) => match.id)).toEqual(["related"]);
  });

  it("normalizes competitions and filters discovery data", async () => {
    const matches: Match[] = [base, { ...base, id: "live", status: "LIVE", competition: "UEFA Champions League", home: { ...base.home, id: "real", slug: "real-madrid", name: "Real Madrid" } }];
    const service = new FootballService({ getMatches: async () => matches }, () => new Date("2026-08-23T09:00:00Z"));
    expect((await service.getCompetitions()).map((item) => item.slug)).toEqual(["premier-league", "uefa-champions-league"]);
    expect(await service.getMatchesByDate("2026-08-23", "premier-league")).toHaveLength(1);
    expect((await service.getLiveMatches()).map((match) => match.id)).toEqual(["live"]);
    expect((await service.getClub("real-madrid"))?.team.name).toBe("Real Madrid");
    expect((await service.getLeague("uefa-champions-league"))?.competition.region).toBe("Europe");
    expect((await service.search("real")).clubs[0].slug).toBe("real-madrid");
  });

  it("deduplicates case and punctuation aliases and scopes league data by slug", async () => {
    const aliases: Match[] = [
      { ...base, id: "canonical", competition: "Premier League", competitionCountry: "England" },
      { ...base, id: "alias", competition: "premier-league", kickoff: "2026-08-23T14:00:00Z" },
    ];
    const service = new FootballService({ getMatches: async () => aliases }, () => new Date("2026-08-23T09:00:00Z"));
    expect(await service.getCompetitions()).toEqual([{ id: "premier-league", slug: "premier-league", name: "Premier League", region: "England" }]);
    expect(await service.getMatchesByDate("2026-08-23", "premier-league")).toHaveLength(2);
    expect((await service.getLeague("premier-league"))?.upcoming).toHaveLength(2);
  });
});
