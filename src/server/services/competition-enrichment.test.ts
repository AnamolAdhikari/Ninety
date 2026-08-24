import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import type { CompetitionFixture } from "@/server/providers/competition/provider";
import { canonicalCompetition, enrichMatchesWithCompetitions } from "./competition-enrichment";

const match: Match = { id: "one", slug: "manchester-united-v-psg", competition: "Football", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T18:00:00Z", home: { id: "one", slug: "manchester-united", name: "Manchester United", shortName: "MUN", colors: ["#000", "#111"] }, away: { id: "two", slug: "paris-saint-germain", name: "Paris Saint-Germain", shortName: "PSG", colors: ["#222", "#333"] } };
const fixture = (overrides: Partial<CompetitionFixture> = {}): CompetitionFixture => ({ homeTeam: "Manchester United", awayTeam: "Paris Saint-Germain", kickoff: "2026-08-23T18:00:00Z", competition: "UEFA Champions League", country: "Europe", ...overrides });

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

  it("rejects kickoff mismatches and ambiguous candidates", () => {
    expect(enrichMatchesWithCompetitions([match], [fixture({ kickoff: "2026-08-23T18:16:00Z" })])[0].competition).toBe("Football");
    expect(enrichMatchesWithCompetitions([match], [fixture(), fixture({ competition: "Premier League" })])[0].competition).toBe("Football");
  });

  it("never overwrites authoritative primary competition metadata", () => {
    const primary = { ...match, competition: "Premier League", competitionCountry: "England" };
    expect(enrichMatchesWithCompetitions([primary], [fixture()])[0]).toMatchObject({ competition: "Premier League", competitionCountry: "England" });
  });
});
