import type { Match } from "@/domain/football/types";

export interface FootballProvider {
  getMatches(): Promise<Match[]>;
}
