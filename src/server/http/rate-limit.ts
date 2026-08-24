import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { createRequestId, logServerEvent } from "@/server/observability/logger";

export type RateLimitPolicy = "search" | "metadata" | "playback";
export interface RateLimitBinding { limit(input: { key: string }): Promise<{ success: boolean }>; }

const bindings: Record<RateLimitPolicy, keyof CloudflareEnv> = { search: "SEARCH_RATE_LIMITER", metadata: "METADATA_RATE_LIMITER", playback: "PLAYBACK_RATE_LIMITER" };

function requestKey(request: Request, policy: RateLimitPolicy) {
  const actor = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  return `${policy}:${actor}`;
}

export async function enforceRateLimit(request: Request, policy: RateLimitPolicy, limiter?: RateLimitBinding): Promise<NextResponse | null> {
  let activeLimiter = limiter;
  if (!activeLimiter) {
    try { activeLimiter = getCloudflareContext().env[bindings[policy]] as RateLimitBinding | undefined; }
    catch { return null; }
  }
  if (!activeLimiter) return null;
  let success: boolean;
  try { ({ success } = await activeLimiter.limit({ key: requestKey(request, policy) })); }
  catch { logServerEvent("unexpected_server_error", undefined, { subsystem: "rate_limit" }); return null; }
  if (success) return null;
  const requestId = createRequestId();
  logServerEvent("rate_limited", requestId, { policy });
  return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60", "x-request-id": requestId } });
}
