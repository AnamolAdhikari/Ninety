import type { Competition } from "./types";

const preferredCompetitionOrder = new Map([
  ["premier-league", 0],
  ["la-liga", 1],
  ["bundesliga", 2],
  ["serie-a", 3],
  ["ligue-1", 4],
  ["champions-league", 5],
]);

const worldCompetitionOrder = new Map([
  ...preferredCompetitionOrder,
  ["europa-league", 6],
  ["conference-league", 7],
  ["football", 8],
]);

export const competitionPriority = (slug: string) => slug === "football" ? 1_000 : preferredCompetitionOrder.get(slug) ?? 100;
const filterCompetitionPriority = (slug: string) => slug === "football" ? 6 : preferredCompetitionOrder.get(slug) ?? 100;
export function orderedCompetitions(competitions: Competition[]) {
  return [...competitions].sort((a, b) => filterCompetitionPriority(a.slug) - filterCompetitionPriority(b.slug) || a.name.localeCompare(b.name));
}

export function orderedWorldCompetitions(competitions: Competition[]) {
  return [...competitions].sort((a, b) => (worldCompetitionOrder.get(a.slug) ?? 100) - (worldCompetitionOrder.get(b.slug) ?? 100) || a.name.localeCompare(b.name));
}
