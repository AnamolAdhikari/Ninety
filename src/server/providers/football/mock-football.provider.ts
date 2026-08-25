import type { Match, Team } from "@/domain/football/types";
import type { FootballProvider } from "./provider";

const team = (id: string, name: string, shortName: string, colors: [string, string], crestUrl?: string): Team => ({ id, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""), name, shortName, colors, crestUrl });

const matches: Match[] = [
  { id: "arsenal-manchester-city-e2708b44", slug: "arsenal-v-manchester-city", competition: "Premier League", stage: "Matchday 27", status: "LIVE", popular: true, minute: 67, kickoff: "2026-08-23T18:30:00Z", home: team("arsenal-91c2", "Arsenal", "ARS", ["#e30613", "#fff"], "/badges/intentionally-missing-crest.svg"), away: team("manchester-city-7c3a", "Manchester City", "MCI", ["#6cabdd", "#fff"]), homeScore: 2, awayScore: 1 },
  { id: "barcelona-inter-31c010da", slug: "barcelona-v-inter", competition: "UEFA Champions League", stage: "League phase", status: "UPCOMING", popular: true, kickoff: "2026-08-23T20:00:00Z", home: team("barcelona-cc21", "Barcelona", "BAR", ["#a50044", "#004d98"]), away: team("inter-a212", "Inter", "INT", ["#0068a8", "#000"]) },
  { id: "dortmund-leverkusen-8b5f2a31", slug: "dortmund-v-leverkusen", competition: "Bundesliga", stage: "Matchday 3", status: "FINISHED", popular: false, kickoff: "2026-08-23T14:30:00Z", home: team("dortmund-4cc2", "Dortmund", "BVB", ["#fdeb19", "#000"]), away: team("leverkusen-cb90", "Leverkusen", "B04", ["#e32221", "#000"]), homeScore: 1, awayScore: 1 },
];

export class MockFootballProvider implements FootballProvider {
  async getMatches(): Promise<Match[]> { return matches; }
}
