import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import type { CompetitionFixture } from "@/server/providers/competition/provider";
import { canonicalCompetition, enrichMatchesWithCompetitions } from "./competition-enrichment";

const match: Match = { id: "one", slug: "manchester-united-v-psg", competition: "Football", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T18:00:00Z", home: { id: "one", slug: "manchester-united", name: "Manchester United", shortName: "MUN", colors: ["#000", "#111"] }, away: { id: "two", slug: "paris-saint-germain", name: "Paris Saint-Germain", shortName: "PSG", colors: ["#222", "#333"] } };
const fixture = (overrides: Partial<CompetitionFixture> = {}): CompetitionFixture => ({ homeTeam: "Manchester United", awayTeam: "Paris Saint-Germain", kickoff: "2026-08-23T18:00:00Z", competition: "UEFA Champions League", country: "Europe", ...overrides });
const fulhamMatch: Match = { ...match, id: "fulham-chelsea", slug: "fulham-v-chelsea", kickoff: "2026-08-24T19:00:00Z", home: { ...match.home, id: "fulham", slug: "fulham", name: "Fulham", shortName: "FUL" }, away: { ...match.away, id: "chelsea", slug: "chelsea", name: "Chelsea", shortName: "CHE" } };
const fulhamFixture: CompetitionFixture = { homeTeam: "Fulham FC", awayTeam: "Chelsea FC", kickoff: "2026-08-24T19:00:00Z", competition: "Premier League", country: "England" };

describe("competition enrichment", () => {
  it("canonicalizes supported league names and duplicate variants", () => {
    expect(["Premier League", "premierleague", "england-premier-league"].map((name) => canonicalCompetition(name).slug)).toEqual(["premier-league", "premier-league", "premier-league"]);
    expect(canonicalCompetition("LaLiga")).toMatchObject({ name: "La Liga", slug: "la-liga", region: "Spain" });
    expect(canonicalCompetition("Serie A").slug).toBe("serie-a");
    expect(canonicalCompetition("Bundesliga").slug).toBe("bundesliga");
    expect(canonicalCompetition("Ligue 1").slug).toBe("ligue-1");
    expect(canonicalCompetition("UEFA Champions League")).toMatchObject({ slug: "champions-league", region: "Europe" });
  });

  it("enriches exact and curated alias matches", () => {
    expect(enrichMatchesWithCompetitions([match], [fixture()])[0].competition).toBe("UEFA Champions League");
    expect(enrichMatchesWithCompetitions([match], [fixture({ homeTeam: "Man United", awayTeam: "PSG" })])[0].competition).toBe("UEFA Champions League");
  });

  it("enriches the Fulham and Chelsea FC reproduction", () => expect(enrichMatchesWithCompetitions([fulhamMatch], [fulhamFixture])[0]).toMatchObject({ competition: "Premier League", competitionCountry: "England" }));

  it.each([
    ["Arsenal", "Arsenal FC"],
    ["Manchester City", "Manchester City FC"],
    ["Liverpool", "Liverpool FC"],
    ["Bournemouth", "AFC Bournemouth"],
    ["Barcelona", "FC Barcelona"],
    ["Roma", "AS Roma"],
  ])("matches conservative club marker or curated alias variants: %s / %s", (primaryName, metadataName) => {
    const primary = { ...match, home: { ...match.home, name: primaryName } };
    expect(enrichMatchesWithCompetitions([primary], [fixture({ homeTeam: metadataName })])[0].competition).toBe("UEFA Champions League");
  });

  it("rejects kickoff mismatches and ambiguous candidates", () => {
    expect(enrichMatchesWithCompetitions([match], [fixture({ kickoff: "2026-08-23T18:16:00Z" })])[0].competition).toBe("Football");
    expect(enrichMatchesWithCompetitions([match], [fixture(), fixture({ competition: "Premier League" })])[0].competition).toBe("Football");
  });

  it("rejects reversed and similarly named but unrelated teams", () => {
    expect(enrichMatchesWithCompetitions([fulhamMatch], [{ ...fulhamFixture, homeTeam: "Chelsea FC", awayTeam: "Fulham FC" }])[0].competition).toBe("Football");
    expect(enrichMatchesWithCompetitions([fulhamMatch], [{ ...fulhamFixture, homeTeam: "Fulham United", awayTeam: "Chelsea U21" }])[0].competition).toBe("Football");
  });

  it("never overwrites authoritative primary competition metadata", () => {
    const primary = { ...match, competition: "Premier League", competitionCountry: "England" };
    expect(enrichMatchesWithCompetitions([primary], [fixture()])[0]).toMatchObject({ competition: "Premier League", competitionCountry: "England" });
  });
});
