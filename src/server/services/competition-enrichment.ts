import type { Match } from "@/domain/football/types";
import type { CompetitionFixture } from "@/server/providers/competition/provider";
import { canonicalCompetition } from "@/domain/football/competition-identity";
export { canonicalCompetition } from "@/domain/football/competition-identity";

export const plainSlug = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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
    const candidates = fixtures.filter((fixture) => teamKey(fixture.homeTeam) === teamKey(match.home.name)
      && teamKey(fixture.awayTeam) === teamKey(match.away.name)
      && Math.abs(new Date(fixture.kickoff).valueOf() - new Date(match.kickoff).valueOf()) <= FIXTURE_KICKOFF_TOLERANCE_MS);
    if (candidates.length !== 1) return current.slug !== GENERIC_COMPETITION ? { ...match, competition: current.name, competitionCountry: current.region } : match;
    const fixture = candidates[0];
    const enriched = canonicalCompetition(fixture.competition, fixture.country);
    const competition = current.slug !== GENERIC_COMPETITION ? current : enriched;
    const score = fixture.homeScore != null && fixture.awayScore != null ? { homeScore: fixture.homeScore, awayScore: fixture.awayScore } : {};
    return {
      ...match,
      competition: competition.name,
      competitionCountry: competition.region,
      status: fixture.status ?? match.status,
      stage: fixture.status === "LIVE" ? "Live coverage" : fixture.status === "FINISHED" ? "Full time" : match.stage,
      ...(fixture.status === "LIVE" && fixture.minute != null ? { minute: fixture.minute } : fixture.status === "FINISHED" ? { minute: undefined } : {}),
      ...score,
    };
  });
}
