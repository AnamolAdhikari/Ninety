export interface CompetitionFixture {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  competition: string;
  country?: string;
  status?: "LIVE" | "UPCOMING" | "FINISHED";
  minute?: number;
  homeScore?: number;
  awayScore?: number;
}

export interface CompetitionMetadataProvider {
  getFixtures(): Promise<CompetitionFixture[]>;
}

export const disabledCompetitionMetadataProvider: CompetitionMetadataProvider = {
  getFixtures: async () => [],
};
