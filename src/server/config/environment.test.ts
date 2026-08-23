import { describe, expect, it } from "vitest";
import { validateServerEnvironment } from "./environment";

describe("server environment", () => {
  it("uses safe development defaults", () => expect(validateServerEnvironment({ NODE_ENV: "development" })).toMatchObject({ footballProvider: "mock", streamProvider: "mock" }));
  it("requires production provider configuration", () => expect(() => validateServerEnvironment({ NODE_ENV: "production" })).toThrow("FOOTBALL_PROVIDER_BASE_URL"));
  it("rejects insecure provider and embed origins", () => {
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_PROVIDER: "streamed", FOOTBALL_PROVIDER_BASE_URL: "http://example.com" })).toThrow("HTTPS");
    expect(() => validateServerEnvironment({ NODE_ENV: "development", FOOTBALL_EMBED_ORIGINS: "http://embed.example.com" })).toThrow("HTTPS");
  });
});
