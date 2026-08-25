import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import { byLivePriority, competitionsFrom, fixtureIdentity, fixtureTeamIdentity, FootballService, matchesCompetition, mergeFixtureCollection, mergeMatch, searchScore, shouldLeadWithLive, strongestCrestUrl } from "./football.service";

const base: Match = { id: "base", slug: "a-v-b", competition: "Premier League", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T12:00:00Z", home: { id: "a", slug: "a", name: "A", shortName: "A", colors: ["#000", "#fff"] }, away: { id: "b", slug: "b", name: "B", shortName: "B", colors: ["#000", "#fff"] } };

describe("FootballService", () => {
  it("deduplicates and sorts live, today, and upcoming matches", async () => {
    const matches: Match[] = [{ ...base, id: "later", kickoff: "2026-08-23T15:00:00Z" }, { ...base, id: "live-low", status: "LIVE", kickoff: "2026-08-23T10:00:00Z" }, { ...base, id: "live-popular", status: "LIVE", popular: true, kickoff: "2026-08-23T11:00:00Z" }, { ...base, id: "later", kickoff: "2026-08-23T15:00:00Z" }];
    const dashboard = await new FootballService({ getMatches: async () => matches }, () => new Date("2026-08-23T09:00:00Z")).getDashboard();
    expect(dashboard.live.map((match) => match.id)).toEqual(["live-low"]);
    expect(dashboard.today.map((match) => match.id)).toEqual(["later"]);
    expect(dashboard.upcoming).toEqual([]);
    expect(dashboard.featured?.id).toBe("live-popular");
  });

  it("supports a completely empty provider response", async () => {
    const dashboard = await new FootballService({ getMatches: async () => [] }).getDashboard();
    expect(dashboard.featured).toBeNull();
    expect(dashboard.matches).toEqual([]);
  });

  it("uses the best upcoming fixture as the hero when nothing is live", async () => {
    const dashboard = await new FootballService({ getMatches: async () => [{ ...base, id: "ordinary" }, { ...base, id: "popular", popular: true, kickoff: "2026-08-23T14:00:00Z" }] }, () => new Date("2026-08-23T09:00:00Z")).getDashboard();
    expect(dashboard.featured?.id).toBe("popular");
    expect(dashboard.competitionSections.flatMap((section) => section.matches).map((match) => match.id)).not.toContain("popular");
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
    expect((await service.getLeague("premier-league"))?.today).toHaveLength(2);
    expect((await service.getLeague("premier-league"))?.upcoming).toHaveLength(0);
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

  it("keeps the strongest crest through null or malformed refresh metadata", () => {
    expect(strongestCrestUrl("https://images.example/real.webp", undefined)).toBe("https://images.example/real.webp");
    expect(strongestCrestUrl("https://images.example/real.webp", "not-a-url")).toBe("https://images.example/real.webp");
    expect(strongestCrestUrl(undefined, "/teams/local.svg")).toBe("/teams/local.svg");
  });

  it("prepares the exhaustive schedule from one normalized provider snapshot", async () => {
    let calls = 0;
    const service = new FootballService({ getMatches: async () => { calls += 1; return [base]; } });
    const schedule = await service.getMatchSchedule("2026-08-23");
    expect(calls).toBe(1);
    expect(schedule.groups).toEqual([expect.objectContaining({ slug: "premier-league", name: "Premier League", matches: [expect.objectContaining({ id: "base" })] })]);
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

  it("keeps authoritative secondary competitions navigable without fabricating fixtures", async () => {
    const service = new FootballService(
      { getMatches: async () => [] },
      () => new Date("2026-08-23T09:00:00Z"),
      { getFixtures: async () => [{ homeTeam: "Arsenal FC", awayTeam: "Chelsea FC", kickoff: base.kickoff, competition: "Premier League", country: "England", status: "UPCOMING" }] },
    );
    expect(await service.getCompetitions()).toEqual([{ id: "premier-league", slug: "premier-league", name: "Premier League", region: "England", fixtureCount: 0, liveCount: 0, upcomingCount: 0, clubCount: 0 }]);
    expect(await service.getLeague("premier-league")).toMatchObject({ competition: { slug: "premier-league" }, clubs: [], results: [], live: [], today: [], upcoming: [] });
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
    const finished = { ...strong, status: "FINISHED" as const, stage: "Full time", minute: undefined, playableLive: undefined };
    expect(mergeMatch(finished, { ...strong, status: "LIVE", stage: "Live coverage", homeScore: 1, awayScore: 2, minute: 89, playableLive: true })).toMatchObject({ status: "FINISHED", stage: "Full time", homeScore: 2, awayScore: 3, minute: undefined, playableLive: undefined });
  });

  it("keeps an enriched score across dashboard refresh and Football filtering", async () => {
    let response: Match[] = [{ ...base, status: "LIVE", homeScore: 2, awayScore: 3 }];
    const service = new FootballService({ getMatches: async () => response });
    expect((await service.getDashboard()).featured).toMatchObject({ homeScore: 2, awayScore: 3 });
    response = [{ ...base, status: "LIVE" }];
    expect((await service.getLiveDiscovery("football")).matches[0]).toMatchObject({ homeScore: 2, awayScore: 3 });
  });

  it("preserves an authoritative finished-today result after it leaves the primary live feed", async () => {
    const fulhamChelsea: Match = {
      ...base,
      id: "fulham-chelsea",
      slug: "fulham-v-chelsea",
      competition: "Football",
      status: "LIVE",
      stage: "Live coverage",
      kickoff: "2026-08-23T12:00:00Z",
      homeScore: 2,
      awayScore: 3,
      minute: 90,
      playableLive: true,
      home: { ...base.home, id: "fulham", slug: "fulham", name: "Fulham", crestUrl: "https://images.example/fulham" },
      away: { ...base.away, id: "chelsea", slug: "chelsea", name: "Chelsea", crestUrl: "https://images.example/chelsea" },
    };
    let primary: Match[] = [fulhamChelsea];
    let status: "LIVE" | "FINISHED" = "LIVE";
    const service = new FootballService(
      { getMatches: async () => primary },
      () => new Date("2026-08-23T18:00:00Z"),
      { getFixtures: async () => [{ homeTeam: "Fulham FC", awayTeam: "Chelsea FC", kickoff: fulhamChelsea.kickoff, competition: "Premier League", country: "England", status, homeScore: 2, awayScore: 3 }] },
    );

    expect((await service.getDashboard()).featured).toMatchObject({ id: "fulham-chelsea" });
    primary = [];
    status = "FINISHED";

    const dashboard = await service.getDashboard();
    expect(dashboard.live).toEqual([]);
    expect(dashboard.today).toEqual([expect.objectContaining({ id: "fulham-chelsea", competition: "Premier League", status: "FINISHED", stage: "Full time", homeScore: 2, awayScore: 3, minute: undefined, playableLive: undefined })]);
    expect(dashboard.matches).toHaveLength(1);
    const league = await service.getLeague("premier-league");
    expect(league?.results).toEqual([expect.objectContaining({ status: "FINISHED", homeScore: 2, awayScore: 3 })]);
    expect(league?.today).toEqual([]);
    expect(await service.getLiveMatches()).toEqual([]);
    expect(await service.getMatchesByDate("2026-08-23")).toEqual([expect.objectContaining({ status: "FINISHED", homeScore: 2, awayScore: 3 })]);
  });

  it("does not retain a missing finished fixture on the next day", async () => {
    let primary: Match[] = [{ ...base, status: "FINISHED", stage: "Full time", homeScore: 2, awayScore: 3 }];
    let now = new Date("2026-08-23T18:00:00Z");
    const service = new FootballService({ getMatches: async () => primary }, () => now);
    expect((await service.getDashboard()).today).toHaveLength(1);
    primary = [];
    now = new Date("2026-08-24T12:00:00Z");
    expect((await service.getDashboard()).matches).toEqual([]);
    expect((await service.getLeague("premier-league"))?.results).toEqual([]);
  });

  it("keeps a recently represented league navigable without resurfacing an old result", async () => {
    let primary: Match[] = [{ ...base, status: "FINISHED", stage: "Full time", homeScore: 2, awayScore: 3 }];
    const service = new FootballService({ getMatches: async () => primary }, () => new Date("2026-08-24T12:00:00Z"));
    expect((await service.getLeague("premier-league"))?.results).toEqual([]);
    primary = [];
    const league = await service.getLeague("premier-league");
    expect(league?.competition.slug).toBe("premier-league");
    expect(league?.results).toEqual([]);
  });

  it("retains a previously normalized future fixture across a weaker primary snapshot", async () => {
    let primary: Match[] = [{ ...base, competition: "Premier League", kickoff: "2026-08-24T14:00:00Z" }];
    const service = new FootballService({ getMatches: async () => primary }, () => new Date("2026-08-23T12:00:00Z"));
    expect((await service.getLeague("premier-league"))?.upcoming).toHaveLength(1);
    primary = [];
    expect((await service.getLeague("premier-league"))?.upcoming).toEqual([expect.objectContaining({ id: "base", competition: "Premier League" })]);
  });

  it("keeps normalized competition navigation stable without retaining a missing live fixture", async () => {
    let primary: Match[] = [{ ...base, status: "LIVE", competition: "Premier League" }];
    const service = new FootballService({ getMatches: async () => primary }, () => new Date("2026-08-23T12:00:00Z"));
    expect((await service.getCompetitions()).map((competition) => competition.slug)).toEqual(["premier-league"]);
    primary = [];
    expect(await service.getLiveMatches()).toEqual([]);
    expect((await service.getCompetitions()).map((competition) => competition.slug)).toEqual(["premier-league"]);
    expect((await service.getLeague("premier-league"))?.live).toEqual([]);
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

  it("ranks major live competitions before popular generic provider fixtures", () => {
    const genericPopular = { ...base, id: "generic", slug: "generic", competition: "Football", status: "LIVE" as const, popular: true };
    const premierLeague = { ...base, id: "premier", slug: "premier", status: "LIVE" as const, popular: false };
    expect([genericPopular, premierLeague].sort(byLivePriority).map((match) => match.id)).toEqual(["premier", "generic"]);
  });

  it("keeps live fixtures out of the league Today section", async () => {
    const live = { ...base, id: "live", slug: "live", status: "LIVE" as const };
    const scheduled = { ...base, id: "scheduled", slug: "scheduled", kickoff: "2026-08-23T14:00:00Z" };
    const league = await new FootballService({ getMatches: async () => [live, scheduled] }, () => new Date("2026-08-23T09:00:00Z")).getLeague("premier-league");
    expect(league?.live.map((match) => match.id)).toEqual(["live"]);
    expect(league?.today.map((match) => match.id)).toEqual(["scheduled"]);
  });

  it("returns disjoint league Results, Live, Today, and future Upcoming groups", async () => {
    const matches: Match[] = [
      { ...base, id: "result", status: "FINISHED", stage: "Full time", homeScore: 2, awayScore: 3 },
      { ...base, id: "live", status: "LIVE", kickoff: "2026-08-23T13:00:00Z" },
      { ...base, id: "today", kickoff: "2026-08-23T14:00:00Z" },
      { ...base, id: "future", kickoff: "2026-08-24T14:00:00Z" },
    ];
    const league = await new FootballService({ getMatches: async () => matches }, () => new Date("2026-08-23T09:00:00Z")).getLeague("premier-league");
    expect(league?.results.map((match) => match.id)).toEqual(["result"]);
    expect(league?.live.map((match) => match.id)).toEqual(["live"]);
    expect(league?.today.map((match) => match.id)).toEqual(["today"]);
    expect(league?.upcoming.map((match) => match.id)).toEqual(["future"]);
    expect(new Set([...(league?.results ?? []), ...(league?.live ?? []), ...(league?.today ?? []), ...(league?.upcoming ?? [])].map((match) => match.id)).size).toBe(4);
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
