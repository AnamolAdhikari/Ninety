import { env } from "cloudflare:workers";

export { findFixture } from "./football-fixtures";
export type { Fixture } from "./football-fixtures";
export class FootballDataError extends Error {}
const pending = new Map<string, Promise<unknown[]>>();
export async function footballData<T>(path: string, ttl = 1800): Promise<T[]> {
  const key = (env as unknown as { API_FOOTBALL_KEY?: string }).API_FOOTBALL_KEY;
  if (!key) throw new FootballDataError("Lineup data is not connected yet.");
  const cacheKey = new Request(`https://ninety-cache.invalid/football-v2/${encodeURIComponent(path)}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache?.match(cacheKey);
  if (cached) { const data = await cached.json() as { response?: T[]; error?: string }; if (data.error) throw new FootballDataError(data.error); return data.response ?? []; }
  const existing = pending.get(path); if (existing) return existing as Promise<T[]>;
  const task = (async () => {
    const response = await fetch(`https://v3.football.api-sports.io/${path}`, { headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(10000) });
    const data = await response.json() as { response?: T[]; errors?: unknown };
    const errors = data.errors && Object.keys(data.errors as object).length ? JSON.stringify(data.errors).toLowerCase() : "";
    if (!response.ok || errors) {
      const message = /limit|quota|requests/.test(errors) || response.status === 429 ? "The lineup provider request limit has been reached. Lineups will resume when the allowance resets." : /plan|subscription|season/.test(errors) ? "This fixture is not available on the connected football data plan." : "The football data provider could not complete this request. Please try again later.";
      await cache?.put(cacheKey, Response.json({ error: message }, { headers: { "Cache-Control": "public, max-age=1800" } }));
      throw new FootballDataError(message);
    }
    const result = data.response ?? [];
    await cache?.put(cacheKey, Response.json({ response: result }, { headers: { "Cache-Control": `public, max-age=${ttl}` } }));
    return result;
  })();
  pending.set(path, task);
  try { return await task; } finally { pending.delete(path); }
}
