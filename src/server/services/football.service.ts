import "server-only";
import type { ClubData, Competition, FootballDashboardData, FootballMatchCenterData, FootballSearchData, LeagueData, Match, Team } from "@/domain/football/types";
import { createFootballProvider } from "@/server/providers/football/provider.factory";
import type { FootballProvider } from "@/server/providers/football/provider";

const byKickoff = (a: Match, b: Match) => new Date(a.kickoff).valueOf() - new Date(b.kickoff).valueOf();
const byLivePriority = (a: Match, b: Match) => Number(b.popular) - Number(a.popular) || byKickoff(a, b);
const sameLocalDay = (value: string, now: Date) => {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};
export const competitionSlug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const regionFor = (name: string) => ({ "premier-league": "England", laliga: "Spain", "la-liga": "Spain", "serie-a": "Italy", bundesliga: "Germany", "uefa-champions-league": "Europe" }[competitionSlug(name)] ?? "Worldwide");
const competitionsFrom = (matches: Match[]): Competition[] => {
  const competitions = new Map<string, Competition>();
  for (const match of matches) {
    const slug = competitionSlug(match.competition);
    if (!slug) continue;
    const existing = competitions.get(slug);
    if (!existing) competitions.set(slug, { id: slug, slug, name: match.competition.trim(), region: match.competitionCountry ?? regionFor(match.competition) });
    else if (match.competitionCountry && existing.region === "Worldwide") competitions.set(slug, { ...existing, region: match.competitionCountry });
  }
  return [...competitions.values()];
};
const teamsFrom = (matches: Match[]): Team[] => [...new Map(matches.flatMap((match) => [match.home, match.away]).map((team) => [team.slug, team])).values()];

export class FootballService {
  constructor(private readonly provider: FootballProvider, private readonly clock: () => Date = () => new Date()) {}

  async getDashboard(): Promise<FootballDashboardData> {
    const now = this.clock();
    const unique = [...new Map((await this.provider.getMatches()).map((match) => [match.id, match])).values()];
    const live = unique.filter((match) => match.status === "LIVE").sort(byLivePriority);
    const today = unique.filter((match) => sameLocalDay(match.kickoff, now)).sort(byKickoff);
    const upcoming = unique.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now).sort(byKickoff);
    const matches = [...live, ...today.filter((match) => !live.some((liveMatch) => liveMatch.id === match.id)), ...upcoming.filter((match) => !today.some((todayMatch) => todayMatch.id === match.id))];
    return { generatedAt: now.toISOString(), featured: live[0] ?? upcoming.find((match) => match.popular) ?? upcoming[0] ?? today[0] ?? null, live, today, upcoming, matches, competitions: competitionsFrom(unique) };
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

  async getMatchesByDate(date: string, competition?: string): Promise<Match[]> { const matches = await this.provider.getMatches(); return matches.filter((match) => match.kickoff.slice(0, 10) === date && (!competition || competitionSlug(match.competition) === competition)).sort(byKickoff); }
  async getLiveMatches(competition?: string): Promise<Match[]> { return (await this.provider.getMatches()).filter((match) => match.status === "LIVE" && (!competition || competitionSlug(match.competition) === competition)).sort(byLivePriority); }
  async getCompetitions(): Promise<Competition[]> { return competitionsFrom(await this.provider.getMatches()); }
  async getLeague(slug: string): Promise<LeagueData | null> { const matches = await this.provider.getMatches(); const competition = competitionsFrom(matches).find((item) => item.slug === slug); if (!competition) return null; const scoped = matches.filter((match) => competitionSlug(match.competition) === slug).sort(byKickoff); const now = this.clock(); return { competition, live: scoped.filter((match) => match.status === "LIVE"), today: scoped.filter((match) => sameLocalDay(match.kickoff, now)), upcoming: scoped.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now) }; }
  async getClub(slug: string): Promise<ClubData | null> { const matches = await this.provider.getMatches(); const team = teamsFrom(matches).find((item) => item.slug === slug); if (!team) return null; const scoped = matches.filter((match) => match.home.slug === slug || match.away.slug === slug).sort(byKickoff); const now = this.clock(); return { team, matches: scoped, live: scoped.filter((match) => match.status === "LIVE"), upcoming: scoped.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now), competitions: competitionsFrom(scoped) }; }
  async getClubs(slugs?: string[]): Promise<ClubData[]> { const matches = await this.provider.getMatches(); const wanted = slugs ? new Set(slugs) : null; return teamsFrom(matches).filter((team) => !wanted || wanted.has(team.slug)).map((team) => { const scoped = matches.filter((match) => match.home.slug === team.slug || match.away.slug === team.slug).sort(byKickoff); return { team, matches: scoped, live: scoped.filter((match) => match.status === "LIVE"), upcoming: scoped.filter((match) => match.status === "UPCOMING"), competitions: competitionsFrom(scoped) }; }); }
  async search(query: string): Promise<FootballSearchData> { const term = query.trim().toLowerCase(); if (term.length < 2) return { clubs: [], matches: [], competitions: [] }; const matches = await this.provider.getMatches(); const clubs = teamsFrom(matches).filter((team) => team.name.toLowerCase().includes(term)).slice(0, 6); const competitions = competitionsFrom(matches).filter((competition) => competition.name.toLowerCase().includes(term)).slice(0, 4); const matching = matches.filter((match) => `${match.home.name} ${match.away.name} ${match.competition}`.toLowerCase().includes(term)).slice(0, 8); return { clubs, matches: matching, competitions }; }
}

let service: FootballService | undefined;
export function getFootballService() { return service ??= new FootballService(createFootballProvider()); }
