import { describe, expect, it } from "vitest";
import { validateServerEnvironment } from "./environment";

describe("server environment", () => {
  it("uses safe development defaults", () => expect(validateServerEnvironment({ NODE_ENV: "development" })).toMatchObject({ footballProvider: "mock", streamProvider: "mock" }));
  it("requires production provider configuration", () => expect(() => validateServerEnvironment({ NODE_ENV: "production" })).toThrow("FOOTBALL_PROVIDER_BASE_URL"));
  it("rejects insecure provider and embed origins", () => {
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_PROVIDER: "streamed", FOOTBALL_PROVIDER_BASE_URL: "http://example.com" })).toThrow("HTTPS");
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_EMBED_ORIGINS: "http://embed.example.com" })).toThrow("HTTPS");
  });
  it("keeps competition enrichment optional and server-only", () => {
    expect(validateServerEnvironment({ NODE_ENV: "development" }).competitionProvider).toBe("disabled");
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_COMPETITION_PROVIDER: "football-data", FOOTBALL_COMPETITION_API_BASE_URL: "http://api.example", FOOTBALL_COMPETITION_API_TOKEN: "secret" })).toThrow("HTTPS");
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_COMPETITION_PROVIDER: "football-data", FOOTBALL_COMPETITION_API_BASE_URL: "https://api.example" })).toThrow("API token");
  });
});
