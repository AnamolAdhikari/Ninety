import type { FootballDashboardData, Match, Team } from "@/domain/football/types";
import type { FootballProvider } from "./provider";
const team = (id: string, name: string, shortName: string, colors: [string, string]): Team => ({ id, name, shortName, colors });
const matches: Match[] = [
  { id: "ars-mci", competition: "Premier League", stage: "Matchday 27", status: "LIVE", minute: 67, kickoff: "2026-08-23T18:30:00Z", home: team("ars", "Arsenal", "ARS", ["#e30613", "#fff"]), away: team("mci", "Manchester City", "MCI", ["#6cabdd", "#fff"]), homeScore: 2, awayScore: 1 },
  { id: "fcb-int", competition: "UEFA Champions League", stage: "League phase", status: "UPCOMING", kickoff: "2026-08-23T20:00:00Z", home: team("fcb", "Barcelona", "BAR", ["#a50044", "#004d98"]), away: team("int", "Inter", "INT", ["#0068a8", "#000"]) },
  { id: "bvb-lev", competition: "Bundesliga", stage: "Matchday 3", status: "FINISHED", kickoff: "2026-08-23T14:30:00Z", home: team("bvb", "Dortmund", "BVB", ["#fdeb19", "#000"]), away: team("b04", "Leverkusen", "B04", ["#e32221", "#000"]), homeScore: 1, awayScore: 1 },
  { id: "psg-om", competition: "Ligue 1", stage: "Matchday 4", status: "UPCOMING", kickoff: "2026-08-23T21:00:00Z", home: team("psg", "Paris SG", "PSG", ["#004170", "#da291c"]), away: team("om", "Marseille", "OM", ["#2faee0", "#fff"]) },
];
export class MockFootballProvider implements FootballProvider { async getDashboard(): Promise<FootballDashboardData> { return { generatedAt: new Date().toISOString(), featured: matches[0], matches, competitions: [{ id: "pl", name: "Premier League", region: "England" }, { id: "ucl", name: "Champions League", region: "Europe" }, { id: "laliga", name: "LaLiga", region: "Spain" }, { id: "seriea", name: "Serie A", region: "Italy" }] }; } }
