export type MatchStatus = "LIVE" | "UPCOMING" | "FINISHED";
export interface Team { id: string; name: string; shortName: string; colors: [string, string]; }
export interface Match { id: string; competition: string; stage: string; status: MatchStatus; minute?: number; kickoff: string; home: Team; away: Team; homeScore?: number; awayScore?: number; }
export interface FootballDashboardData { generatedAt: string; featured: Match; matches: Match[]; competitions: { id: string; name: string; region: string }[]; }
