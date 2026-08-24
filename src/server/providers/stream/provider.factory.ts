import "server-only";
import type { StreamProvider } from "./provider";
import { ConfiguredStreamProvider } from "./configured.provider";
import { MockStreamProvider } from "./mock.provider";
import { StreamProviderError } from "./stream-error";
import { validateServerEnvironment, type EnvironmentSource } from "@/server/config/environment";
export function createStreamProvider(env: EnvironmentSource = process.env): StreamProvider { let config; try { config = validateServerEnvironment(env); } catch (error) { throw new StreamProviderError("Stream provider configuration is invalid.", { cause: error }); } if (config.streamProvider === "mock") return new MockStreamProvider(); return new ConfiguredStreamProvider(config.streamCatalogJson!); }
