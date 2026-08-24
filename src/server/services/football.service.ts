import "server-only";
import type { ClubData, Competition, FootballDashboardData, FootballMatchCenterData, FootballSearchData, LeagueData, Match, MatchDiscoveryData, Team } from "@/domain/football/types";
import { createFootballProvider } from "@/server/providers/football/provider.factory";
import type { FootballProvider } from "@/server/providers/football/provider";
import { createCompetitionMetadataProvider } from "@/server/providers/competition/provider.factory";
import { disabledCompetitionMetadataProvider, type CompetitionMetadataProvider } from "@/server/providers/competition/provider";
import { canonicalCompetition, enrichMatchesWithCompetitions, plainSlug } from "./competition-enrichment";
import { streamAvailability, type StreamAvailabilityCache } from "./stream-availability";
import { competitionPriority } from "@/domain/football/competition-order";

const byKickoff = (a: Match, b: Match) => new Date(a.kickoff).valueOf() - new Date(b.kickoff).valueOf();
const RECENT_FINISHED_RETENTION_MS = 2 * 24 * 60 * 60 * 1000;
const isRecentFinished = (match: Match, now: Date) => {
  const elapsed = now.valueOf() - new Date(match.kickoff).valueOf();
  return match.status === "FINISHED" && elapsed >= 0 && elapsed <= RECENT_FINISHED_RETENTION_MS;
};
const hasCurrentLiveState = (match: Match) => match.homeScore != null && match.awayScore != null || match.minute != null;
export const byLivePriority = (a: Match, b: Match) => Number(b.playableLive === true && hasCurrentLiveState(b)) - Number(a.playableLive === true && hasCurrentLiveState(a)) || Number(b.playableLive === true) - Number(a.playableLive === true) || competitionPriority(competitionSlug(a.competition)) - competitionPriority(competitionSlug(b.competition)) || Number(b.popular) - Number(a.popular) || byKickoff(a, b);
export const shouldLeadWithLive = (matches: Match[]) => matches.some((match) => match.status === "LIVE" && match.playableLive === true);
const sameLocalDay = (value: string, now: Date) => {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export const competitionSlug = (name: string) => canonicalCompetition(name).slug;
export const matchesCompetition = (match: Match, competition?: string) => !competition || competition === "football" || competitionSlug(match.competition) === competition;
const fixtureIdentityConnectors = new Set(["a", "de", "del", "el", "la", "los", "las"]);
export const fixtureTeamIdentity = (name: string) => {
  const tokens = plainSlug(name).split("-").filter(Boolean);
  if (tokens.length < 2) return tokens.join("-");
  return tokens.filter((token) => !fixtureIdentityConnectors.has(token) && !["fc", "cf", "afc"].includes(token)).join("-");
};
export const fixtureIdentity = (match: Match) => `${fixtureTeamIdentity(match.home.name)}:${fixtureTeamIdentity(match.away.name)}:${new Date(match.kickoff).toISOString()}`;

export function mergeMatch(previous: Match, incoming: Match): Match {
  const staleAfterFinished = previous.status === "FINISHED" && incoming.status !== "FINISHED";
  const status = staleAfterFinished ? "FINISHED" : previous.status === "LIVE" && incoming.status === "UPCOMING" ? "LIVE" : incoming.status;
  const incomingHasScore = !staleAfterFinished && incoming.homeScore != null && incoming.awayScore != null;
  return {
    ...previous,
    ...incoming,
    id: previous.id,
    status,
    stage: staleAfterFinished ? previous.stage : incoming.stage,
    competition: incoming.competition === "Football" && previous.competition !== "Football" ? previous.competition : incoming.competition,
    competitionCountry: incoming.competitionCountry ?? previous.competitionCountry,
    posterUrl: incoming.posterUrl ?? previous.posterUrl,
    home: { ...previous.home, ...incoming.home, crestUrl: incoming.home.crestUrl ?? previous.home.crestUrl },
    away: { ...previous.away, ...incoming.away, crestUrl: incoming.away.crestUrl ?? previous.away.crestUrl },
    homeScore: incomingHasScore ? incoming.homeScore : previous.homeScore,
    awayScore: incomingHasScore ? incoming.awayScore : previous.awayScore,
    minute: status === "FINISHED" ? undefined : incoming.minute ?? previous.minute,
    playableLive: status === "LIVE" ? incoming.playableLive ?? previous.playableLive : undefined,
  };
}

export function mergeFixtureCollection(matches: Match[], previous: ReadonlyMap<string, Match> = new Map()) {
  const merged = new Map<string, Match>();
  for (const incoming of matches) {
    const key = fixtureIdentity(incoming);
    const known = merged.get(key) ?? previous.get(key);
    merged.set(key, known ? mergeMatch(known, incoming) : incoming);
  }
  return [...merged.values()];
}
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

export const footballCompetition = (matches: Match[]): Competition => ({ id: "football", slug: "football", name: "Football", region: "Worldwide", fixtureCount: matches.length, liveCount: matches.filter((match) => match.status === "LIVE").length, upcomingCount: matches.filter((match) => match.status === "UPCOMING").length, clubCount: teamsFrom(matches).length });

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
  private readonly known = new Map<string, Match>();
  private readonly knownCompetitions = new Map<string, Competition>();
  constructor(private readonly provider: FootballProvider, private readonly clock: () => Date = () => new Date(), private readonly competitionProvider: CompetitionMetadataProvider = disabledCompetitionMetadataProvider, private readonly availability: Pick<StreamAvailabilityCache, "get"> = streamAvailability) {}

  private async matches() {
    const [primary, secondary] = await Promise.allSettled([this.provider.getMatches(), this.competitionProvider.getFixtures()]);
    if (primary.status === "rejected") throw primary.reason;
    if (secondary.status === "fulfilled") {
      for (const fixture of secondary.value) {
        const canonical = canonicalCompetition(fixture.competition, fixture.country);
        const current = this.knownCompetitions.get(canonical.slug);
        this.knownCompetitions.set(canonical.slug, current ?? { id: canonical.slug, slug: canonical.slug, name: canonical.name, region: canonical.region, fixtureCount: 0, liveCount: 0, upcomingCount: 0, clubCount: 0 });
      }
    }
    const now = this.clock();
    const primaryIdentities = new Set(primary.value.map(fixtureIdentity));
    const retainedCandidates = [...this.known.entries()]
      .filter(([identity, match]) => !primaryIdentities.has(identity) && (sameLocalDay(match.kickoff, now) || match.status === "UPCOMING" && new Date(match.kickoff) > now || isRecentFinished(match, now)))
      .map(([, match]) => match);
    const enriched = enrichMatchesWithCompetitions([...primary.value, ...retainedCandidates], secondary.status === "fulfilled" ? secondary.value : [])
      .filter((match) => primaryIdentities.has(fixtureIdentity(match)) || isRecentFinished(match, now) || match.status === "UPCOMING" && new Date(match.kickoff) > now)
      .map((match) => match.status === "LIVE" ? { ...match, playableLive: this.availability.get(match.id) } : { ...match, playableLive: undefined });
    const unique = mergeFixtureCollection(enriched, this.known);
    this.known.clear();
    for (const match of unique) this.known.set(fixtureIdentity(match), match);
    for (const competition of competitionsFrom(unique)) this.knownCompetitions.set(competition.slug, competition);
    return unique;
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
    return { matches: all.filter((match) => match.kickoff.slice(0, 10) === date && matchesCompetition(match, competition)).sort(byKickoff), competitions: [footballCompetition(all), ...competitionsFrom(all).filter((item) => item.slug !== "football")] };
  }

  async getLiveDiscovery(competition?: string): Promise<MatchDiscoveryData> {
    const all = await this.matches();
    const live = all.filter((match) => match.status === "LIVE");
    const matches = live.filter((match) => matchesCompetition(match, competition)).sort(byLivePriority);
    return { matches, competitions: [footballCompetition(live), ...competitionsFrom(live).filter((item) => item.slug !== "football")] };
  }

  async getMatchesByDate(date: string, competition?: string) { return (await this.getMatchDiscovery(date, competition)).matches; }
  async getLiveMatches(competition?: string) { return (await this.getLiveDiscovery(competition)).matches; }
  async getCompetitions() { await this.matches(); return [...this.knownCompetitions.values()].sort((a, b) => b.liveCount - a.liveCount || b.fixtureCount - a.fixtureCount || a.name.localeCompare(b.name)); }

  async getLeague(slug: string): Promise<LeagueData | null> {
    const all = await this.matches();
    const competitions = [...this.knownCompetitions.values()];
    const competition = competitions.find((item) => item.slug === slug);
    if (!competition) return null;
    const scoped = all.filter((match) => competitionSlug(match.competition) === slug).sort(byKickoff);
    const now = this.clock();
    const live = scoped.filter((match) => match.status === "LIVE");
    return {
      competition,
      competitions,
      live,
      results: scoped.filter((match) => match.status === "FINISHED" && sameLocalDay(match.kickoff, now)),
      today: scoped.filter((match) => match.status === "UPCOMING" && sameLocalDay(match.kickoff, now)),
      upcoming: scoped.filter((match) => match.status === "UPCOMING" && new Date(match.kickoff) > now && !sameLocalDay(match.kickoff, now)),
      clubs: teamsFrom(scoped).sort((a, b) => a.name.localeCompare(b.name)),
    };
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
    service = new FootballService(provider, undefined, competitionProvider);
  }
  return service;
}
