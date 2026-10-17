/**
 * Provider-independent contract for the NINETY Match Centre.
 *
 * Provider adapters normalize upstream payloads into these types. Missing
 * information remains null or unavailable; it must never be invented.
 * This module has no runtime dependencies and does not change existing APIs.
 */
export type MatchDataFreshness = "fresh" | "stale";
export type MatchDataSource = {
  provider: string;
  checkedAt: number;
  freshness: MatchDataFreshness;
};
export type MatchScore = { home: number | null; away: number | null };
export type MatchEvent = {
  minute: number | null;
  extra: number | null;
  team: string;
  player: string;
  assist: string;
  type: "Goal" | "Card" | "subst" | "Var";
  detail: string;
};
export type MatchPlayer = {
  id?: number;
  name: string;
  number?: number | null;
  pos?: string;
  photo?: string;
};
export type MatchTeamLineup = {
  name: string;
  formation: string | null;
  confirmed: boolean;
  players: MatchPlayer[];
  substitutes: MatchPlayer[];
  coach: { name: string; photo?: string } | null;
  logo?: string;
};
export type MatchLineups = {
  status: "confirmed" | "partial" | "unavailable";
  home: MatchTeamLineup | null;
  away: MatchTeamLineup | null;
};
export type MatchStatistic = {
  name: string;
  home: number | string | null;
  away: number | string | null;
};
export type MatchSnapshot = {
  fixture: {
    home: string;
    away: string;
    kickoff: number;
    providerIds: Record<string, string | number>;
  };
  status: string | null;
  score: MatchScore | null;
  clock: { minute: number | null; extra: number | null } | null;
  events: MatchEvent[] | null;
  lineups: MatchLineups | null;
  statistics: MatchStatistic[] | null;
  sources: Partial<Record<"fixture" | "status" | "score" | "clock" | "events" | "lineups" | "statistics", MatchDataSource>>;
};
