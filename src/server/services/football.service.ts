import "server-only";
import { cache } from "react";
import type { ClubData, Competition, FootballDashboardData, FootballMatchCenterData, FootballSearchData, LeagueData, Match, MatchDiscoveryData, Team } from "@/domain/football/types";
import { createFootballProvider } from "@/server/providers/football/provider.factory";
import type { FootballProvider } from "@/server/providers/football/provider";
import { createCompetitionMetadataProvider } from "@/server/providers/competition/provider.factory";
import { disabledCompetitionMetadataProvider, type CompetitionMetadataProvider } from "@/server/providers/competition/provider";
import { canonicalCompetition, enrichMatchesWithCompetitions } from "./competition-enrichment";

const byKickoff = (a: Match, b: Match) => new Date(a.kickoff).valueOf() - new Date(b.kickoff).valueOf();
const byLivePriority = (a: Match, b: Match) => Number(b.popular) - Number(a.popular) || byKickoff(a, b);
const sameLocalDay = (value: string, now: Date) => {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export const competitionSlug = (name: string) => canonicalCompetition(name).slug;
const teamsFrom = (matches: Match[]): Team[] => {
  const teams = new Map<string, Team>();
  for (const team of matches.flatMap((match) => [match.home, match.away])) {
    const current = teams.get(team.slug);
    if (!current || (!current.crestUrl && team.crestUrl)) teams.set(team.slug, team);
  }
  return [...teams.values()];
};

export function competitionsFrom(matches: Match[]): Competition[] {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const slug = canonicalCompetition(match.competition, match.competitionCountry).slug;
    if (!slug) continue;
    grouped.set(slug, [...(grouped.get(slug) ?? []), match]);
  }
  return [...grouped.entries()].map(([slug, fixtures]) => {
    const first = fixtures[0];
    const canonical = canonicalCompetition(first.competition, fixtures.find((match) => match.competitionCountry)?.competitionCountry);
    return {
      id: slug,
      slug,
      name: canonical.name,
      region: canonical.region,
      fixtureCount: fixtures.length,
      liveCount: fixtures.filter((match) => match.status === "LIVE").length,
      upcomingCount: fixtures.filter((match) => match.status === "UPCOMING").length,
      clubCount: teamsFrom(fixtures).length,
    };
  }).sort((a, b) => b.liveCount - a.liveCount || b.fixtureCount - a.fixtureCount || a.name.localeCompare(b.name));
}

const searchable = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
export function searchScore(value: string, query: string) {
  const candidate = searchable(value);
  const term = searchable(query);
  if (!term || !candidate.includes(term)) return 0;
  if (candidate === term) return 100;
  if (candidate.startsWith(term)) return 80;
  if (candidate.split(" ").some((token) => token.startsWith(term))) return 60;
  return 40;
}

export class FootballService {
  constructor(private readonly provider: FootballProvider, private readonly clock: () => Date = () => new Date(), private readonly competitionProvider: CompetitionMetadataProvider = disabledCompetitionMetadataProvider) {}

  private async matches() {
    const [primary, secondary] = await Promise.allSettled([this.provider.getMatches(), this.competitionProvider.getFixtures()]);
    if (primary.status === "rejected") throw primary.reason;
    const enriched = enrichMatchesWithCompetitions(primary.value, secondary.status === "fulfilled" ? secondary.value : []);
    return [...new Map(enriched.map((match) => [match.id, match])).values()];
  }

  async getDashboard(): Promise<FootballDashboardData> {
    const now = this.clock();
    const unique = await this.matches();
    const live = unique.filter((match) => match.status === "LIVE").sort(byLivePriority);
    const today = unique.filter((match) => sameLocalDay(match.kickoff, now)).sort(byKickoff);
    const upcoming = unique.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now).sort(byKickoff);
    const matches = [...live, ...today.filter((match) => !live.some((liveMatch) => liveMatch.id === match.id)), ...upcoming.filter((match) => !today.some((todayMatch) => todayMatch.id === match.id))];
    return { generatedAt: now.toISOString(), featured: live[0] ?? upcoming.find((match) => match.popular) ?? upcoming[0] ?? today[0] ?? null, live, today, upcoming, matches, competitions: competitionsFrom(unique) };
  }

  async getMatchById(matchId: string) { return (await this.matches()).find((match) => match.id === matchId) ?? null; }

  async getMatchCenter(matchId: string): Promise<FootballMatchCenterData | null> {
    const matches = await this.matches();
    const match = matches.find((candidate) => candidate.id === matchId);
    if (!match) return null;
    const related = matches.filter((candidate) => candidate.id !== match.id).sort((a, b) => Number(competitionSlug(b.competition) === competitionSlug(match.competition)) - Number(competitionSlug(a.competition) === competitionSlug(match.competition)) || Number(b.status === "LIVE") - Number(a.status === "LIVE") || byKickoff(a, b)).slice(0, 6);
    return { match, related };
  }

  async getMatchDiscovery(date: string, competition?: string): Promise<MatchDiscoveryData> {
    const all = await this.matches();
    return { matches: all.filter((match) => match.kickoff.slice(0, 10) === date && (!competition || competitionSlug(match.competition) === competition)).sort(byKickoff), competitions: competitionsFrom(all) };
  }

  async getLiveDiscovery(competition?: string): Promise<MatchDiscoveryData> {
    const all = await this.matches();
    return { matches: all.filter((match) => match.status === "LIVE" && (!competition || competitionSlug(match.competition) === competition)).sort(byLivePriority), competitions: competitionsFrom(all) };
  }

  async getMatchesByDate(date: string, competition?: string) { return (await this.getMatchDiscovery(date, competition)).matches; }
  async getLiveMatches(competition?: string) { return (await this.getLiveDiscovery(competition)).matches; }
  async getCompetitions() { return competitionsFrom(await this.matches()); }

  async getLeague(slug: string): Promise<LeagueData | null> {
    const all = await this.matches();
    const competition = competitionsFrom(all).find((item) => item.slug === slug);
    if (!competition) return null;
    const scoped = all.filter((match) => competitionSlug(match.competition) === slug).sort(byKickoff);
    const now = this.clock();
    return { competition, live: scoped.filter((match) => match.status === "LIVE"), today: scoped.filter((match) => sameLocalDay(match.kickoff, now)), upcoming: scoped.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now), clubs: teamsFrom(scoped).sort((a, b) => a.name.localeCompare(b.name)) };
  }

  async getClub(slug: string): Promise<ClubData | null> {
    const matches = await this.matches();
    const team = teamsFrom(matches).find((item) => item.slug === slug);
    if (!team) return null;
    const scoped = matches.filter((match) => match.home.slug === slug || match.away.slug === slug).sort(byKickoff);
    const now = this.clock();
    return { team, matches: scoped, live: scoped.filter((match) => match.status === "LIVE"), upcoming: scoped.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now), competitions: competitionsFrom(scoped) };
  }

  async getClubs(slugs?: string[]): Promise<ClubData[]> {
    const matches = await this.matches();
    const wanted = slugs ? new Set(slugs) : null;
    return teamsFrom(matches).filter((team) => !wanted || wanted.has(team.slug)).map((team) => {
      const scoped = matches.filter((match) => match.home.slug === team.slug || match.away.slug === team.slug).sort(byKickoff);
      return { team, matches: scoped, live: scoped.filter((match) => match.status === "LIVE"), upcoming: scoped.filter((match) => match.status === "UPCOMING"), competitions: competitionsFrom(scoped) };
    });
  }

  async search(query: string): Promise<FootballSearchData> {
    const term = query.trim();
    if (term.length < 2) return { clubs: [], matches: [], competitions: [] };
    const matches = await this.matches();
    const ranked = <T,>(items: T[], label: (item: T) => string, limit: number) => items.map((item) => ({ item, score: searchScore(label(item), term) })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score || label(a.item).localeCompare(label(b.item))).slice(0, limit).map(({ item }) => item);
    return {
      clubs: ranked(teamsFrom(matches), (team) => team.name, 6),
      competitions: ranked(competitionsFrom(matches), (competition) => `${competition.name} ${competition.region ?? ""}`, 4),
      matches: ranked(matches, (match) => `${match.home.name} ${match.away.name} ${match.competition}`, 8),
    };
  }
}

let service: FootballService | undefined;
export function getFootballService() {
  if (!service) {
    const provider = createFootballProvider();
    const competitionProvider = createCompetitionMetadataProvider();
    const getMatches = cache(() => provider.getMatches());
    const getFixtures = cache(() => competitionProvider.getFixtures());
    service = new FootballService({ getMatches }, undefined, { getFixtures });
  }
  return service;
}
