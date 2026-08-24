export interface CompetitionFixture {
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  competition: string;
  country?: string;
}

export interface CompetitionMetadataProvider {
  getFixtures(): Promise<CompetitionFixture[]>;
}

export const disabledCompetitionMetadataProvider: CompetitionMetadataProvider = {
  getFixtures: async () => [],
};
