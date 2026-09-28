export const MATCH_WINDOW_MS = 3.5 * 60 * 60_000;

type MatchLifecycle = { date?: number; live?: boolean; apiSources?: readonly unknown[] };

export function isMatchEnded(match: MatchLifecycle, now: number): boolean {
  return Number.isFinite(match.date) && now > match.date! + MATCH_WINDOW_MS;
}

export function isEffectivelyLive(match: MatchLifecycle, now: number): boolean {
  return Boolean(match.live && match.apiSources?.length && Number.isFinite(match.date) && !isMatchEnded(match, now));
}
