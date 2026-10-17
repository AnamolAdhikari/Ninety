import type { Fixture } from "./football-fixtures";
import type { MatchDataSource, MatchEvent, MatchSnapshot } from "./match-snapshot";

export type ApiFootballEvent = {
  time?: { elapsed?: number; extra?: number | null };
  team?: { name?: string };
  player?: { name?: string };
  assist?: { name?: string };
  type?: string;
  detail?: string;
};

const supportedEventTypes = new Set(["Goal", "Card", "subst", "Var"]);
export function normalizeApiFootballEvents(events: ApiFootballEvent[]): MatchEvent[] {
  return events.filter(event => supportedEventTypes.has(event.type ?? "")).slice(0, 150).map(event => ({
    minute: event.time?.elapsed ?? null,
    extra: event.time?.extra ?? null,
    team: event.team?.name ?? "",
    player: event.player?.name ?? "",
    assist: event.assist?.name ?? "",
    type: event.type as MatchEvent["type"],
    detail: event.detail ?? "",
  }));
}

export function apiFootballMatchSnapshot(
  fixture: Fixture,
  events: ApiFootballEvent[] | null,
  eventSource: MatchDataSource | null,
): MatchSnapshot {
  const kickoff = Date.parse(fixture.fixture?.date ?? "");
  const id = fixture.fixture?.id;
  const homeScore = fixture.goals?.home ?? fixture.score?.fulltime?.home ?? null;
  const awayScore = fixture.goals?.away ?? fixture.score?.fulltime?.away ?? null;
  const status = fixture.fixture?.status?.short ?? null;
  const score = homeScore === null && awayScore === null ? null : { home: homeScore, away: awayScore };
  return {
    fixture: {
      home: fixture.teams?.home?.name ?? "",
      away: fixture.teams?.away?.name ?? "",
      kickoff: Number.isFinite(kickoff) ? kickoff : 0,
      providerIds: id != null ? { "API-Football": id } : {},
    },
    status,
    score,
    clock: null,
    events: events === null ? null : normalizeApiFootballEvents(events),
    lineups: null,
    statistics: null,
    sources: eventSource ? { events: eventSource } : {},
  };
}
