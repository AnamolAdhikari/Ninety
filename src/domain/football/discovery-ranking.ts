import type { Match } from "./types";
import { competitionPriority } from "./competition-order";

const HOUR = 60 * 60 * 1000;
const sameLocalDay = (value: string, now: Date) => {
  const date = new Date(value);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
};

export function homepageRelevance(match: Match, now: Date, competitionSlug: (name: string) => string) {
  const kickoff = new Date(match.kickoff).valueOf();
  const untilKickoff = kickoff - now.valueOf();
  const live = match.status === "LIVE";
  return (live ? 10_000 : 0)
    + (live && match.playableLive === true ? 4_000 : 0)
    + (match.popular ? 1_200 : 0)
    + Math.max(0, 1_000 - competitionPriority(competitionSlug(match.competition)) * 100)
    + (match.status === "UPCOMING" && untilKickoff >= 0 && untilKickoff <= HOUR ? 700 : 0)
    + (sameLocalDay(match.kickoff, now) ? 300 : 0);
}

export function rankHomepageMatches(matches: Match[], now: Date, competitionSlug: (name: string) => string) {
  return [...matches].sort((a, b) => homepageRelevance(b, now, competitionSlug) - homepageRelevance(a, now, competitionSlug)
    || new Date(a.kickoff).valueOf() - new Date(b.kickoff).valueOf()
    || a.id.localeCompare(b.id));
}

export function groupHomepageMatches(matches: Match[], now: Date, competitionSlug: (name: string) => string) {
  const ranked = rankHomepageMatches(matches, now, competitionSlug);
  const live = ranked.filter((match) => match.status === "LIVE");
  const featured = live[0] ?? null;
  const assigned = new Set(featured ? [featured.id] : []);
  const take = (predicate: (match: Match) => boolean) => ranked.filter((match) => !assigned.has(match.id) && predicate(match)).filter((match) => (assigned.add(match.id), true));
  const liveNow = take((match) => match.status === "LIVE");
  const startingSoon = take((match) => match.status === "UPCOMING" && new Date(match.kickoff).valueOf() >= now.valueOf() && new Date(match.kickoff).valueOf() - now.valueOf() <= HOUR);
  const today = take((match) => match.status !== "LIVE" && sameLocalDay(match.kickoff, now));
  const upcoming = take((match) => match.status === "UPCOMING" && new Date(match.kickoff).valueOf() > now.valueOf());
  return { featured, live: liveNow, startingSoon, today, upcoming };
}
