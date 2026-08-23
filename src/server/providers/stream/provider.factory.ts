import "server-only";
import type { StreamProvider } from "./provider";
import { ConfiguredStreamProvider } from "./configured.provider";
import { MockStreamProvider } from "./mock.provider";
import { StreamProviderError } from "./stream-error";
import { validateServerEnvironment } from "@/server/config/environment";
export function createStreamProvider(env: NodeJS.ProcessEnv = process.env): StreamProvider { let config; try { config = validateServerEnvironment(env); } catch (error) { throw new StreamProviderError("Stream provider configuration is invalid.", { cause: error }); } if (config.streamProvider === "mock") return new MockStreamProvider(); return new ConfiguredStreamProvider(config.streamCatalogJson!); }
