import type { Competition, CompetitionMatchSection, Match } from "./types";
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

const sectionStrength = (matches: Match[], slug: string, now: Date) => Math.max(...matches.map((match) =>
  (match.status === "LIVE" ? 10_000 : 0)
  + (match.status === "LIVE" && match.playableLive === true ? 5_000 : 0)
  + (match.popular ? 1_500 : 0)
  + Math.max(0, 1_200 - competitionPriority(slug) * 80)
  + Math.max(0, 600 - Math.max(0, new Date(match.kickoff).valueOf() - now.valueOf()) / 60_000),
));

export function buildCompetitionSections(matches: Match[], competitions: Competition[], now: Date, competitionSlug: (name: string) => string) {
  const known = new Map(competitions.map((competition) => [competition.slug, competition]));
  const grouped = new Map<string, Match[]>();
  const otherFootball: Match[] = [];
  for (const match of matches) {
    const slug = competitionSlug(match.competition);
    if (!slug || slug === "football") { otherFootball.push(match); continue; }
    grouped.set(slug, [...(grouped.get(slug) ?? []), match]);
  }
  const competitionSections: CompetitionMatchSection[] = [...grouped].map(([slug, fixtures]) => ({
    competition: known.get(slug) ?? { id: slug, slug, name: fixtures[0].competition, region: fixtures[0].competitionCountry, fixtureCount: fixtures.length, liveCount: fixtures.filter((match) => match.status === "LIVE").length, upcomingCount: fixtures.filter((match) => match.status === "UPCOMING").length, clubCount: new Set(fixtures.flatMap((match) => [match.home.id, match.away.id])).size },
    matches: rankHomepageMatches(fixtures, now, competitionSlug).slice(0, 12),
  })).sort((a, b) => sectionStrength(b.matches, b.competition.slug, now) - sectionStrength(a.matches, a.competition.slug, now) || a.competition.name.localeCompare(b.competition.name));
  return { competitionSections, otherFootball: rankHomepageMatches(otherFootball, now, competitionSlug).slice(0, 12) };
}

export function groupScheduleByCompetition(matches: Match[], competitionSlug: (name: string) => string) {
  const grouped = new Map<string, Match[]>();
  for (const match of matches) {
    const slug = competitionSlug(match.competition) || "football";
    grouped.set(slug, [...(grouped.get(slug) ?? []), match]);
  }
  return [...grouped].map(([slug, fixtures]) => ({ slug, name: slug === "football" ? "Other football" : fixtures[0].competition, matches: fixtures }))
    .sort((a, b) => competitionPriority(a.slug) - competitionPriority(b.slug) || a.name.localeCompare(b.name));
}
