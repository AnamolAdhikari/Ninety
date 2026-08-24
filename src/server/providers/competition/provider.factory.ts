import "server-only";
import { validateServerEnvironment, type EnvironmentSource } from "@/server/config/environment";
import { FootballDataCompetitionProvider } from "./football-data.provider";
import { disabledCompetitionMetadataProvider, type CompetitionMetadataProvider } from "./provider";

export function createCompetitionMetadataProvider(env: EnvironmentSource = process.env): CompetitionMetadataProvider {
  const config = validateServerEnvironment(env);
  if (config.competitionProvider === "disabled") return disabledCompetitionMetadataProvider;
  return new FootballDataCompetitionProvider(config.competitionApiBaseUrl!, config.competitionApiToken!);
}
