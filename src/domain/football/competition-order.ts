import type { Competition } from "./types";

export const competitionPriorityMap = new Map([
  ["champions-league", 1],
  ["premier-league", 2],
  ["la-liga", 3],
  ["serie-a", 4],
  ["bundesliga", 5],
  ["ligue-1", 6],
  ["europa-league", 7],
  ["conference-league", 8],
  ["mls", 9],
  ["saudi-pro-league", 10],
  ["championship", 11],
  ["copa-libertadores", 12],
]);

const worldCompetitionOrder = new Map([
  ...competitionPriorityMap,
  ["football", 1_000],
]);

export const competitionPriority = (slug: string) => slug === "football" ? 1_000 : competitionPriorityMap.get(slug) ?? 100;
const filterCompetitionPriority = (slug: string) => competitionPriority(slug);
export function orderedCompetitions(competitions: Competition[]) {
  return [...competitions].sort((a, b) => filterCompetitionPriority(a.slug) - filterCompetitionPriority(b.slug) || a.name.localeCompare(b.name));
}

export function orderedWorldCompetitions(competitions: Competition[]) {
  return [...competitions].sort((a, b) => (worldCompetitionOrder.get(a.slug) ?? 100) - (worldCompetitionOrder.get(b.slug) ?? 100) || a.name.localeCompare(b.name));
}
