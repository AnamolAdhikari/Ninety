import "server-only";
import type { StreamProvider } from "./provider";
import { ConfiguredStreamProvider } from "./configured.provider";
import { MockStreamProvider } from "./mock.provider";
import { StreamProviderError } from "./stream-error";
export function createStreamProvider(env: NodeJS.ProcessEnv = process.env): StreamProvider { const selection = env.FOOTBALL_STREAM_PROVIDER ?? (env.NODE_ENV === "production" ? "configured" : "mock"); if (selection === "mock") return new MockStreamProvider(); if (selection === "configured") { if (!env.FOOTBALL_STREAM_CATALOG_JSON) throw new StreamProviderError("FOOTBALL_STREAM_CATALOG_JSON is required."); return new ConfiguredStreamProvider(env.FOOTBALL_STREAM_CATALOG_JSON); } throw new StreamProviderError(`Unsupported FOOTBALL_STREAM_PROVIDER value: ${selection}`); }
