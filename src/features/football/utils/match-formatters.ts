import type { Match } from "@/domain/football/types";

export function formatMatchStatus(match: Match) {
  if (match.status === "LIVE") return match.minute != null ? `${match.minute}′ LIVE` : "LIVE";
  if (match.status === "FINISHED") return "FT";
  return "Upcoming";
}

export function matchScore(match: Match) {
  return match.homeScore != null && match.awayScore != null ? `${match.homeScore}–${match.awayScore}` : "VS";
}
