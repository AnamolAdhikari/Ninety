import "server-only";
import type { FootballProvider } from "./provider";
import { MockFootballProvider } from "./mock-football.provider";
import { StreamedFootballProvider } from "./streamed.provider";
import { FootballProviderError } from "./provider-error";
import { validateServerEnvironment } from "@/server/config/environment";

export function createFootballProvider(env: NodeJS.ProcessEnv = process.env): FootballProvider {
  let config;
  try { config = validateServerEnvironment(env); } catch (error) { throw new FootballProviderError("Football provider configuration is invalid.", { cause: error }); }
  const selection = config.footballProvider;
  if (selection === "mock") return new MockFootballProvider();
  if (selection === "streamed") {
    return new StreamedFootballProvider(config.footballProviderBaseUrl!);
  }
  throw new FootballProviderError(`Unsupported FOOTBALL_PROVIDER value: ${selection}`);
}
