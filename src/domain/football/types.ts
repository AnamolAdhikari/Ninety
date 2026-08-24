export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";

export interface Team {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  colors: [string, string];
  crestUrl?: string;
}

export interface Competition { id: string; slug: string; name: string; region?: string; fixtureCount: number; liveCount: number; upcomingCount: number; clubCount: number; }
export interface ClubData { team: Team; matches: Match[]; live: Match[]; upcoming: Match[]; competitions: Competition[]; }
export interface LeagueData { competition: Competition; live: Match[]; today: Match[]; upcoming: Match[]; clubs: Team[]; }
export interface MatchDiscoveryData { matches: Match[]; competitions: Competition[]; }
export interface FootballSearchData { clubs: Team[]; matches: Match[]; competitions: Competition[]; }

export interface Match {
  id: string;
  slug: string;
  competition: string;
  competitionCountry?: string;
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
  playableLive?: boolean;
}

export interface FootballDashboardData {
  generatedAt: string;
  featured: Match | null;
  live: Match[];
  today: Match[];
  upcoming: Match[];
  matches: Match[];
  competitions: Competition[];
}

export interface FootballMatchCenterData {
  match: Match;
  related: Match[];
}
