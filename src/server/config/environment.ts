import "server-only";

export type FootballProviderName = "mock" | "streamed";
export type CompetitionProviderName = "disabled" | "football-data";
export type StreamProviderName = "mock" | "configured" | "streamed";
export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface ServerEnvironment {
  footballProvider: FootballProviderName;
  footballProviderBaseUrl?: string;
  competitionProvider: CompetitionProviderName;
  competitionApiBaseUrl?: string;
  competitionApiToken?: string;
  streamProvider: StreamProviderName;
  streamProviderBaseUrl?: string;
  streamCatalogJson?: string;
  embedOrigins: string[];
  siteUrl: string;
}

const httpsUrl = (value: string, name: string) => {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error(`${name} must be a valid URL.`); }
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  return url.toString().replace(/\/$/, "");
};

export function validateServerEnvironment(env: EnvironmentSource = process.env): ServerEnvironment {
  const production = env.NODE_ENV === "production";
  const footballProvider = (env.FOOTBALL_PROVIDER ?? (production ? "streamed" : "mock")) as FootballProviderName;
  if (!(["mock", "streamed"] as string[]).includes(footballProvider)) throw new Error("FOOTBALL_PROVIDER must be mock or streamed.");
  const footballProviderBaseUrl = env.FOOTBALL_PROVIDER_BASE_URL ? httpsUrl(env.FOOTBALL_PROVIDER_BASE_URL, "FOOTBALL_PROVIDER_BASE_URL") : undefined;
  if (footballProvider === "streamed" && !footballProviderBaseUrl) throw new Error("FOOTBALL_PROVIDER_BASE_URL is required for the streamed provider.");

  const competitionProvider = (env.FOOTBALL_COMPETITION_PROVIDER ?? "disabled") as CompetitionProviderName;
  if (!("disabled football-data".split(" ") as string[]).includes(competitionProvider)) throw new Error("FOOTBALL_COMPETITION_PROVIDER must be disabled or football-data.");
  const competitionApiBaseUrl = env.FOOTBALL_COMPETITION_API_BASE_URL ? httpsUrl(env.FOOTBALL_COMPETITION_API_BASE_URL, "FOOTBALL_COMPETITION_API_BASE_URL") : undefined;
  const competitionApiToken = env.FOOTBALL_COMPETITION_API_TOKEN?.trim() || undefined;
  if (competitionProvider === "football-data" && (!competitionApiBaseUrl || !competitionApiToken)) throw new Error("Competition metadata provider requires an HTTPS base URL and API token.");

  const streamProvider = (env.FOOTBALL_STREAM_PROVIDER ?? (production ? "configured" : "mock")) as StreamProviderName;
  if (!(["mock", "configured", "streamed"] as string[]).includes(streamProvider)) throw new Error("FOOTBALL_STREAM_PROVIDER must be mock, configured, or streamed.");
  const streamProviderBaseUrl = env.FOOTBALL_STREAM_PROVIDER_BASE_URL ? httpsUrl(env.FOOTBALL_STREAM_PROVIDER_BASE_URL, "FOOTBALL_STREAM_PROVIDER_BASE_URL") : undefined;
  const streamCatalogJson = env.FOOTBALL_STREAM_CATALOG_JSON;
  if (streamProvider === "configured") {
    if (!streamCatalogJson) throw new Error("FOOTBALL_STREAM_CATALOG_JSON is required for the configured stream provider.");
    try { const value = JSON.parse(streamCatalogJson); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); }
    catch { throw new Error("FOOTBALL_STREAM_CATALOG_JSON must be a JSON object."); }
  }
  if (streamProvider === "streamed" && !streamProviderBaseUrl) throw new Error("FOOTBALL_STREAM_PROVIDER_BASE_URL is required for the streamed stream provider.");

  const embedOrigins = (env.FOOTBALL_EMBED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean).map((value) => new URL(httpsUrl(value, "FOOTBALL_EMBED_ORIGINS")).origin);
  const siteUrl = env.NINETY_SITE_URL ? httpsUrl(env.NINETY_SITE_URL, "NINETY_SITE_URL") : "http://localhost:3000";
  return { footballProvider, footballProviderBaseUrl, competitionProvider, competitionApiBaseUrl, competitionApiToken, streamProvider, streamProviderBaseUrl, streamCatalogJson, embedOrigins: [...new Set(embedOrigins)], siteUrl };
}
