import type { Match } from "@/domain/football/types";
import type { CompetitionFixture } from "@/server/providers/competition/provider";

export interface CanonicalCompetition { name: string; slug: string; region: string; }

const canonicalCompetitions: Record<string, CanonicalCompetition> = {
  "premier-league": { name: "Premier League", slug: "premier-league", region: "England" },
  premierleague: { name: "Premier League", slug: "premier-league", region: "England" },
  "england-premier-league": { name: "Premier League", slug: "premier-league", region: "England" },
  "la-liga": { name: "La Liga", slug: "la-liga", region: "Spain" },
  laliga: { name: "La Liga", slug: "la-liga", region: "Spain" },
  "primera-division": { name: "La Liga", slug: "la-liga", region: "Spain" },
  "serie-a": { name: "Serie A", slug: "serie-a", region: "Italy" },
  seriea: { name: "Serie A", slug: "serie-a", region: "Italy" },
  bundesliga: { name: "Bundesliga", slug: "bundesliga", region: "Germany" },
  "german-bundesliga": { name: "Bundesliga", slug: "bundesliga", region: "Germany" },
  "ligue-1": { name: "Ligue 1", slug: "ligue-1", region: "France" },
  ligue1: { name: "Ligue 1", slug: "ligue-1", region: "France" },
  "uefa-champions-league": { name: "UEFA Champions League", slug: "champions-league", region: "Europe" },
  "champions-league": { name: "UEFA Champions League", slug: "champions-league", region: "Europe" },
  ucl: { name: "UEFA Champions League", slug: "champions-league", region: "Europe" },
};

export const plainSlug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const canonicalCompetition = (name: string, country?: string): CanonicalCompetition => canonicalCompetitions[plainSlug(name)] ?? { name: name.trim(), slug: plainSlug(name), region: country?.trim() || "Worldwide" };

const teamAliases: Record<string, string> = {
  "man-united": "manchester-united",
  "man-utd": "manchester-united",
  psg: "paris-saint-germain",
  "paris-sg": "paris-saint-germain",
  "inter-milan": "inter",
  internazionale: "inter",
  "as-roma": "roma",
};
const genericClubMarkers = new Set(["fc", "afc", "cf", "sc"]);
const teamKey = (name: string) => {
  const tokens = plainSlug(name).split("-").filter(Boolean);
  while (tokens.length > 1 && genericClubMarkers.has(tokens[0])) tokens.shift();
  while (tokens.length > 1 && genericClubMarkers.has(tokens.at(-1)!)) tokens.pop();
  const key = tokens.join("-");
  return teamAliases[key] ?? key;
};
const GENERIC_COMPETITION = "football";
export const FIXTURE_KICKOFF_TOLERANCE_MS = 15 * 60 * 1000;

export function enrichMatchesWithCompetitions(matches: Match[], fixtures: CompetitionFixture[]): Match[] {
  return matches.map((match) => {
    const current = canonicalCompetition(match.competition, match.competitionCountry);
    if (current.slug !== GENERIC_COMPETITION) return { ...match, competition: current.name, competitionCountry: current.region };
    const candidates = fixtures.filter((fixture) => teamKey(fixture.homeTeam) === teamKey(match.home.name)
      && teamKey(fixture.awayTeam) === teamKey(match.away.name)
      && Math.abs(new Date(fixture.kickoff).valueOf() - new Date(match.kickoff).valueOf()) <= FIXTURE_KICKOFF_TOLERANCE_MS);
    if (candidates.length !== 1) return match;
    const enriched = canonicalCompetition(candidates[0].competition, candidates[0].country);
    if (!enriched.slug || enriched.slug === GENERIC_COMPETITION) return match;
    return { ...match, competition: enriched.name, competitionCountry: enriched.region };
  });
}
