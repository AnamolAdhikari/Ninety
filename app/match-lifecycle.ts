// Kickoff-time fallback only: the stream feed does not report final whistles.
export const MATCH_WINDOW_MS = 2 * 60 * 60_000;
export const ACTIVE_MATCH_HARD_CAP_MS = 2.25 * 60 * 60_000;
export const EXTRA_TIME_HARD_CAP_MS = 3.5 * 60 * 60_000;
type MatchLifecycle = { date?: number; live?: boolean; matchStatus?: string; apiSources?: readonly unknown[] };
const finished = new Set(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]);
const active = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE"]);
const extraTime = new Set(["ET", "BT", "P"]);

export function isMatchEnded(match: MatchLifecycle, now: number): boolean {
  if (match.matchStatus && finished.has(match.matchStatus)) return true;
  if (match.matchStatus && ["NS", "TBD", "PST", "SUSP", "INT"].includes(match.matchStatus)) return false;
  if (!Number.isFinite(match.date)) return false;

  // Provider statuses can become stale when its quota/cache stops refreshing.
  // Only explicit extra-time/penalty statuses get the long window. Ordinary
  // in-play states receive a hard cap so a stale "2H"/"LIVE" cannot keep a
  // finished fixture in NINETY's Live surfaces for hours.
  if (match.matchStatus && extraTime.has(match.matchStatus)) {
    return now >= match.date! + EXTRA_TIME_HARD_CAP_MS;
  }
  if (match.matchStatus && active.has(match.matchStatus)) {
    return now >= match.date! + ACTIVE_MATCH_HARD_CAP_MS;
  }
  return now >= match.date! + MATCH_WINDOW_MS;
}

export function isEffectivelyLive(match: MatchLifecycle, now: number): boolean {
  if (!match.live || !match.apiSources?.length || !Number.isFinite(match.date) || now < match.date! || isMatchEnded(match, now)) return false;
  // The stream feed is the primary source for whether a playable match has started.
  // API-Football can be stale or unavailable when quota is exhausted, so an old NS/TBD
  // must not hide a match that has already kicked off. Explicit terminal/suspended states still win.
  if (match.matchStatus && ["PST","SUSP","INT","CANC","ABD","AWD","WO"].includes(match.matchStatus)) return false;
  return true;
}
