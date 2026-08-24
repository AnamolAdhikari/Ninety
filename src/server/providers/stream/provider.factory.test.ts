import { describe, expect, it } from "vitest";
import { createStreamProvider } from "./provider.factory";
import { ConfiguredStreamProvider } from "./configured.provider";
import { MockStreamProvider } from "./mock.provider";
import { StreamedStreamProvider } from "./streamed.provider";

describe("stream provider factory", () => {
  it("selects providers only through explicit environment configuration", () => {
    expect(createStreamProvider({ NODE_ENV: "development" })).toBeInstanceOf(MockStreamProvider);
    expect(createStreamProvider({ NODE_ENV: "development", FOOTBALL_STREAM_PROVIDER: "configured", FOOTBALL_STREAM_CATALOG_JSON: "{}" })).toBeInstanceOf(ConfiguredStreamProvider);
    expect(createStreamProvider({ NODE_ENV: "development", FOOTBALL_STREAM_PROVIDER: "streamed", FOOTBALL_STREAM_PROVIDER_BASE_URL: "https://provider.example", FOOTBALL_EMBED_ORIGINS: "https://embed.example" })).toBeInstanceOf(StreamedStreamProvider);
  });
});
