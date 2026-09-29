// Kickoff-time fallback only: the stream feed does not report final whistles.
export const MATCH_WINDOW_MS = 2 * 60 * 60_000;
type MatchLifecycle = { date?: number; live?: boolean; matchStatus?: string; apiSources?: readonly unknown[] };
const finished = new Set(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]);
const active = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
export function isMatchEnded(match: MatchLifecycle, now: number): boolean {
  if (match.matchStatus && finished.has(match.matchStatus)) return true;
  if (match.matchStatus && ["NS", "TBD", "PST", "SUSP", "INT"].includes(match.matchStatus)) return false;
  const window = match.matchStatus && active.has(match.matchStatus) ? 3.5 * 60 * 60_000 : MATCH_WINDOW_MS;
  return Number.isFinite(match.date) && now >= match.date! + window;
}
export function isEffectivelyLive(match: MatchLifecycle, now: number): boolean {
  if (match.matchStatus && !active.has(match.matchStatus)) return false;
  return Boolean(match.live && match.apiSources?.length && Number.isFinite(match.date) && now >= match.date! && !isMatchEnded(match, now));
}
