export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  colors: [string, string];
  crestUrl?: string;
}

export interface Match {
  id: string;
  slug: string;
  competition: string;
  stage: string;
  status: MatchStatus;
  popular: boolean;
  minute?: number;
  kickoff: string;
  posterUrl?: string;
  home: Team;
  away: Team;
  homeScore?: number;
  awayScore?: number;
}

export interface FootballDashboardData {
  generatedAt: string;
  featured: Match | null;
  live: Match[];
  today: Match[];
  upcoming: Match[];
  matches: Match[];
  competitions: { id: string; name: string; region: string }[];
}
