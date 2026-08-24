import "server-only";

type ServerEvent = "normalization_rejected" | "provider_timeout" | "provider_unavailable" | "rate_limited" | "stream_resolution_failed" | "unexpected_server_error";

export function createRequestId() { return crypto.randomUUID(); }

export function logServerEvent(event: ServerEvent, requestId?: string, context: Record<string, string | number | boolean> = {}) {
  console.error(JSON.stringify({ service: "ninety", event, requestId, ...context }));
}
