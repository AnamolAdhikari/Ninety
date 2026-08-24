import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import { byLivePriority, competitionsFrom, fixtureIdentity, fixtureTeamIdentity, FootballService, matchesCompetition, mergeFixtureCollection, mergeMatch, searchScore, shouldLeadWithLive } from "./football.service";

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

  it("preserves real crest URLs through a fresh service snapshot", async () => {
    const crestUrl = "https://images.example/api/images/badge/a.webp";
    const dashboard = await new FootballService({ getMatches: async () => [{ ...base, home: { ...base.home, crestUrl } }] }, () => new Date("2026-08-23T09:00:00Z")).getDashboard();
    expect(dashboard.matches[0].home.crestUrl).toBe(crestUrl);
  });

  it("resolves only exact NINETY match IDs and builds related matches", async () => {
    const matches: Match[] = [base, { ...base, id: "related", slug: "c-v-d", home: { ...base.home, id: "c", slug: "c", name: "C" }, away: { ...base.away, id: "d", slug: "d", name: "D" } }];
    const service = new FootballService({ getMatches: async () => matches });
    expect((await service.getMatchById("base"))?.slug).toBe("a-v-b");
    expect(await service.getMatchById("provider-source-id")).toBeNull();
    expect((await service.getMatchCenter("base"))?.related.map((match) => match.id)).toEqual(["related"]);
  });

  it("normalizes competitions and filters discovery data", async () => {
    const matches: Match[] = [base, { ...base, id: "live", status: "LIVE", competition: "UEFA Champions League", home: { ...base.home, id: "real", slug: "real-madrid", name: "Real Madrid" } }];
    const service = new FootballService({ getMatches: async () => matches }, () => new Date("2026-08-23T09:00:00Z"));
    expect((await service.getCompetitions()).map((item) => item.slug)).toEqual(["champions-league", "premier-league"]);
    expect(await service.getMatchesByDate("2026-08-23", "premier-league")).toHaveLength(1);
    expect((await service.getLiveMatches()).map((match) => match.id)).toEqual(["live"]);
    expect((await service.getClub("real-madrid"))?.team.name).toBe("Real Madrid");
    expect((await service.getLeague("champions-league"))?.competition.region).toBe("Europe");
    expect((await service.search("real")).clubs[0].slug).toBe("real-madrid");
  });

  it("deduplicates case and punctuation aliases and scopes league data by slug", async () => {
    const aliases: Match[] = [
      { ...base, id: "canonical", competition: "Premier League", competitionCountry: "England" },
      { ...base, id: "alias", competition: "premier-league", kickoff: "2026-08-23T14:00:00Z" },
    ];
    const service = new FootballService({ getMatches: async () => aliases }, () => new Date("2026-08-23T09:00:00Z"));
    expect(await service.getCompetitions()).toEqual([{ id: "premier-league", slug: "premier-league", name: "Premier League", region: "England", fixtureCount: 2, liveCount: 0, upcomingCount: 2, clubCount: 2 }]);
    expect(await service.getMatchesByDate("2026-08-23", "premier-league")).toHaveLength(2);
    expect((await service.getLeague("premier-league"))?.upcoming).toHaveLength(2);
  });

  it("derives competition intelligence without fabricating provider metadata", () => {
    const matches: Match[] = [base, { ...base, id: "live", status: "LIVE", home: { ...base.home, id: "c", slug: "c", name: "C" } }];
    expect(competitionsFrom(matches)[0]).toMatchObject({ slug: "premier-league", fixtureCount: 2, liveCount: 1, upcomingCount: 1, clubCount: 3 });
  });

  it("loads each discovery view from one provider snapshot", async () => {
    let calls = 0;
    const service = new FootballService({ getMatches: async () => { calls += 1; return [base]; } });
    const discovery = await service.getMatchDiscovery("2026-08-23");
    expect(discovery.matches).toHaveLength(1);
    expect(discovery.competitions.map((item) => item.slug)).toEqual(["football", "premier-league"]);
    expect(calls).toBe(1);
  });

  it("ranks exact and prefix search results above loose matches", () => {
    expect(searchScore("Premier League", "premier league")).toBeGreaterThan(searchScore("Premier League", "premier"));
    expect(searchScore("Premier League", "league")).toBeGreaterThan(searchScore("Premier League", "mier"));
    expect(searchScore("Premier League", "missing")).toBe(0);
  });

  it("isolates secondary provider failures without losing primary fixtures", async () => {
    const service = new FootballService({ getMatches: async () => [base] }, () => new Date("2026-08-23T09:00:00Z"), { getFixtures: async () => { throw new DOMException("timed out", "TimeoutError"); } });
    expect((await service.getDashboard()).matches).toHaveLength(1);
    expect((await service.getCompetitions())[0].name).toBe("Premier League");
  });

  it("derives distinct filters and strictly isolates enriched league fixtures", async () => {
    const generic = [{ ...base, id: "england", competition: "Football" }, { ...base, id: "spain", competition: "Football", home: { ...base.home, id: "real", slug: "real-madrid", name: "Real Madrid" }, away: { ...base.away, id: "barca", slug: "barcelona", name: "Barcelona" } }];
    const metadata = [{ homeTeam: "A", awayTeam: "B", kickoff: base.kickoff, competition: "Premier League", country: "England" }, { homeTeam: "Real Madrid", awayTeam: "Barcelona", kickoff: base.kickoff, competition: "La Liga", country: "Spain" }];
    const service = new FootballService({ getMatches: async () => generic }, undefined, { getFixtures: async () => metadata });
    expect((await service.getCompetitions()).map((item) => item.slug)).toEqual(["la-liga", "premier-league"]);
    expect((await service.getMatchDiscovery("2026-08-23", "la-liga")).matches.map((item) => item.id)).toEqual(["spain"]);
    expect((await service.getLiveDiscovery("premier-league")).matches).toEqual([]);
    expect((await service.getLeague("premier-league"))?.competition.slug).toBe("premier-league");
    expect((await service.getLeague("premier-league"))?.clubs.map((club) => club.slug)).toEqual(["a", "b"]);
  });

  it("enriches the Fulham and Chelsea dashboard fixture from FC-suffixed metadata", async () => {
    const fulhamChelsea: Match = { ...base, id: "fulham-chelsea", slug: "fulham-v-chelsea", competition: "Football", kickoff: "2026-08-24T19:00:00Z", home: { ...base.home, id: "fulham", slug: "fulham", name: "Fulham", shortName: "FUL" }, away: { ...base.away, id: "chelsea", slug: "chelsea", name: "Chelsea", shortName: "CHE" } };
    const service = new FootballService({ getMatches: async () => [fulhamChelsea] }, () => new Date("2026-08-24T12:00:00Z"), { getFixtures: async () => [{ homeTeam: "Fulham FC", awayTeam: "Chelsea FC", kickoff: "2026-08-24T19:00:00Z", competition: "Premier League", country: "England" }] });
    expect((await service.getDashboard()).matches[0].competition).toBe("Premier League");
  });

  it("treats Football as the parent sport while competition filters stay specific", () => {
    expect(matchesCompetition(base, "football")).toBe(true);
    expect(matchesCompetition(base, "premier-league")).toBe(true);
    expect(matchesCompetition(base, "bundesliga")).toBe(false);
  });

  it("preserves enriched fields through weaker refreshes and accepts authoritative updates", () => {
    const strong = { ...base, status: "LIVE" as const, minute: 42, homeScore: 2, awayScore: 3, home: { ...base.home, crestUrl: "https://images.example/a" } };
    const weak = { ...base, competition: "Football", status: "UPCOMING" as const };
    expect(mergeMatch(strong, weak)).toMatchObject({ status: "LIVE", minute: 42, homeScore: 2, awayScore: 3, competition: "Premier League", home: { crestUrl: "https://images.example/a" } });
    expect(mergeMatch(strong, { ...weak, status: "LIVE", homeScore: 3, awayScore: 3, minute: 51 })).toMatchObject({ status: "LIVE", minute: 51, homeScore: 3, awayScore: 3 });
    expect(mergeMatch(strong, { ...weak, status: "FINISHED", homeScore: 2, awayScore: 4 })).toMatchObject({ status: "FINISHED", homeScore: 2, awayScore: 4 });
    expect(mergeMatch(strong, { ...weak, status: "FINISHED" }).minute).toBeUndefined();
  });

  it("keeps an enriched score across dashboard refresh and Football filtering", async () => {
    let response: Match[] = [{ ...base, status: "LIVE", homeScore: 2, awayScore: 3 }];
    const service = new FootballService({ getMatches: async () => response });
    expect((await service.getDashboard()).live[0]).toMatchObject({ homeScore: 2, awayScore: 3 });
    response = [{ ...base, status: "LIVE" }];
    expect((await service.getLiveDiscovery("football")).matches[0]).toMatchObject({ homeScore: 2, awayScore: 3 });
  });

  it("deduplicates stable fixture identity while preserving the strongest score", () => {
    const duplicate = { ...base, id: "provider-duplicate" };
    const scored = { ...base, id: "scored", homeScore: 1, awayScore: 0 };
    const merged = mergeFixtureCollection([scored, duplicate]);
    expect(fixtureIdentity(scored)).toBe(fixtureIdentity(duplicate));
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "scored", homeScore: 1, awayScore: 0 });
  });

  it("keeps live counts and rendered discovery based on one deduplicated collection", async () => {
    const live = { ...base, status: "LIVE" as const };
    const service = new FootballService({ getMatches: async () => [live, { ...live, id: "duplicate" }] });
    const discovery = await service.getLiveDiscovery("football");
    expect(discovery.matches).toHaveLength(1);
    expect(discovery.competitions.find((item) => item.slug === "football")?.liveCount).toBe(discovery.matches.length);
  });

  it("prioritizes enriched playable live matches and falls back without one", () => {
    const unknown = { ...base, id: "unknown", status: "LIVE" as const };
    const playable = { ...base, id: "playable", slug: "playable", status: "LIVE" as const, playableLive: true };
    const enrichedPlayable = { ...playable, id: "scored", slug: "scored", homeScore: 1, awayScore: 0 };
    expect([unknown, playable, enrichedPlayable].sort(byLivePriority).map((match) => match.id)).toEqual(["scored", "playable", "unknown"]);
    expect(shouldLeadWithLive([unknown])).toBe(false);
    expect(shouldLeadWithLive([unknown, playable])).toBe(true);
  });

  it("deduplicates the Málaga and Deportivo naming aliases without collapsing distinct fixtures", () => {
    const malaga = { ...base, id: "malaga-one", slug: "malaga-v-deportivo-la-coruna", status: "LIVE" as const, home: { ...base.home, name: "Málaga", slug: "malaga" }, away: { ...base.away, name: "Deportivo La Coruna", slug: "deportivo-la-coruna" } };
    const alias = { ...malaga, id: "malaga-two", slug: "malaga-v-deportivo-de-a-coruna", away: { ...malaga.away, name: "Deportivo de A Coruña", slug: "deportivo-de-a-coruna" }, homeScore: 1, awayScore: 0 };
    expect(fixtureTeamIdentity(malaga.away.name)).toBe("deportivo-coruna");
    expect(fixtureIdentity(malaga)).toBe(fixtureIdentity(alias));
    expect(mergeFixtureCollection([malaga, alias])).toEqual([expect.objectContaining({ id: "malaga-one", homeScore: 1, awayScore: 0, away: expect.objectContaining({ name: "Deportivo de A Coruña" }) })]);
    expect(fixtureIdentity({ ...alias, kickoff: "2026-08-23T14:00:00Z" })).not.toBe(fixtureIdentity(malaga));
    expect(fixtureIdentity({ ...alias, away: { ...alias.away, name: "Deportivo B" } })).not.toBe(fixtureIdentity(malaga));
  });
});
