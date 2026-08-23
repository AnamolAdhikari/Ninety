import "server-only";
import type { FootballProvider } from "./provider";
import { MockFootballProvider } from "./mock-football.provider";
import { StreamedFootballProvider } from "./streamed.provider";
import { FootballProviderError } from "./provider-error";

export function createFootballProvider(env: NodeJS.ProcessEnv = process.env): FootballProvider {
  const selection = env.FOOTBALL_PROVIDER ?? (env.NODE_ENV === "production" ? "streamed" : "mock");
  if (selection === "mock") return new MockFootballProvider();
  if (selection === "streamed") {
    const baseUrl = env.FOOTBALL_PROVIDER_BASE_URL;
    if (!baseUrl) throw new FootballProviderError("FOOTBALL_PROVIDER_BASE_URL is required for the streamed provider.");
    return new StreamedFootballProvider(baseUrl.replace(/\/$/, ""));
  }
  throw new FootballProviderError(`Unsupported FOOTBALL_PROVIDER value: ${selection}`);
}
