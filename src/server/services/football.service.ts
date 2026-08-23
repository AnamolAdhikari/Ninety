import "server-only";
import type { FootballDashboardData, FootballMatchCenterData, Match } from "@/domain/football/types";
import { createFootballProvider } from "@/server/providers/football/provider.factory";
import type { FootballProvider } from "@/server/providers/football/provider";

const byKickoff = (a: Match, b: Match) => new Date(a.kickoff).valueOf() - new Date(b.kickoff).valueOf();
const byLivePriority = (a: Match, b: Match) => Number(b.popular) - Number(a.popular) || byKickoff(a, b);
const sameLocalDay = (value: string, now: Date) => {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export class FootballService {
  constructor(private readonly provider: FootballProvider, private readonly clock: () => Date = () => new Date()) {}

  async getDashboard(): Promise<FootballDashboardData> {
    const now = this.clock();
    const unique = [...new Map((await this.provider.getMatches()).map((match) => [match.id, match])).values()];
    const live = unique.filter((match) => match.status === "LIVE").sort(byLivePriority);
    const today = unique.filter((match) => sameLocalDay(match.kickoff, now)).sort(byKickoff);
    const upcoming = unique.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now).sort(byKickoff);
    const matches = [...live, ...today.filter((match) => !live.some((liveMatch) => liveMatch.id === match.id)), ...upcoming.filter((match) => !today.some((todayMatch) => todayMatch.id === match.id))];
    const competitionNames = [...new Set(unique.map((match) => match.competition).filter(Boolean))];
    return { generatedAt: now.toISOString(), featured: live[0] ?? upcoming.find((match) => match.popular) ?? upcoming[0] ?? today[0] ?? null, live, today, upcoming, matches, competitions: competitionNames.map((name) => ({ id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name, region: name === "Football" ? "Worldwide" : "Football" })) };
  }

  async getMatchById(matchId: string): Promise<Match | null> {
    const matches = await this.provider.getMatches();
    return matches.find((match) => match.id === matchId) ?? null;
  }

  async getMatchCenter(matchId: string): Promise<FootballMatchCenterData | null> {
    const matches = await this.provider.getMatches();
    const match = matches.find((candidate) => candidate.id === matchId);
    if (!match) return null;
    const related = matches
      .filter((candidate) => candidate.id !== match.id)
      .sort((a, b) => Number(b.competition === match.competition) - Number(a.competition === match.competition) || Number(b.status === "LIVE") - Number(a.status === "LIVE") || byKickoff(a, b))
      .slice(0, 6);
    return { match, related };
  }
}

let service: FootballService | undefined;
export function getFootballService() { return service ??= new FootballService(createFootballProvider()); }
