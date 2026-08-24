import type { Competition } from "./types";

const preferredCompetitionOrder = new Map([
  ["premier-league", 0],
  ["la-liga", 1],
  ["bundesliga", 2],
  ["serie-a", 3],
  ["ligue-1", 4],
  ["champions-league", 5],
]);

export const competitionPriority = (slug: string) => slug === "football" ? 1_000 : preferredCompetitionOrder.get(slug) ?? 100;
export function orderedCompetitions(competitions: Competition[]) {
  return [...competitions].sort((a, b) => competitionPriority(a.slug) - competitionPriority(b.slug) || a.name.localeCompare(b.name));
}
