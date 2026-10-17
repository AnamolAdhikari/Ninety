import { recordHealth } from "./service-health";
import { env } from "cloudflare:workers";

export { findFixture } from "./football-fixtures";
export type { Fixture } from "./football-fixtures";
export class FootballDataError extends Error {}
export type FootballDataMeta<T>={response:T[];checkedAt:number;freshness:"fresh"|"stale"};
const pending = new Map<string, Promise<FootballDataMeta<unknown>>>();
const STALE_TTL = 24 * 60 * 60;
const EMPTY_TTL = 90;
const QUOTA_ERROR_TTL = 1800;
const staleKeyFor = (path:string) => new Request(`https://ninety-cache.invalid/football-v3-last-good/${encodeURIComponent(path)}`);
export async function footballDataWithMeta<T>(path: string, ttl = 1800): Promise<FootballDataMeta<T>> {
  const key = (env as unknown as { API_FOOTBALL_KEY?: string }).API_FOOTBALL_KEY;
  if (!key) throw new FootballDataError("Lineup data is not connected yet.");
  const cacheKey = new Request(`https://ninety-cache.invalid/football-v3/${encodeURIComponent(path)}`);
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache?.match(cacheKey);
  if (cached) { const data = await cached.json() as { response?: T[]; error?: string; checkedAt?:number }; if (data.error) { const stale = await cache?.match(staleKeyFor(path)); if (stale) { const previous = await stale.json() as {response?:T[];checkedAt?:number}; if (previous.response?.length) return {response:previous.response,checkedAt:previous.checkedAt??0,freshness:"stale"}; } throw new FootballDataError(data.error); } if (!data.response?.length) { const stale = await cache?.match(staleKeyFor(path)); if (stale) { const previous = await stale.json() as {response?:T[];checkedAt?:number}; if (previous.response?.length) return {response:previous.response,checkedAt:previous.checkedAt??0,freshness:"stale"}; } } return {response:data.response??[],checkedAt:data.checkedAt??0,freshness:"fresh"}; }
  const existing = pending.get(path); if (existing) return existing as Promise<FootballDataMeta<T>>;
  const task = (async () => {
    const response = await fetch(`https://v3.football.api-sports.io/${path}`, { headers: { "x-apisports-key": key }, signal: AbortSignal.timeout(10000) });
    const data = await response.json() as { response?: T[]; errors?: unknown };
    const errors = data.errors && Object.keys(data.errors as object).length ? JSON.stringify(data.errors).toLowerCase() : "";
    if (!response.ok || errors) {
      const message = /limit|quota|requests/.test(errors) || response.status === 429 ? "The football data provider request allowance has been reached. Live match data will resume when it resets." : /plan|subscription|season/.test(errors) ? "This fixture is not available on the connected football data plan." : "The football data provider could not complete this request. Please try again later.";
      await cache?.put(cacheKey, Response.json({ error: message }, { headers: { "Cache-Control": `public, max-age=${QUOTA_ERROR_TTL}` } }));
      throw new FootballDataError(message);
    }
    const result:FootballDataMeta<T> = {response:data.response??[],checkedAt:Date.now(),freshness:"fresh"};
    await cache?.put(cacheKey, Response.json(result, { headers: { "Cache-Control": `public, max-age=${result.response.length ? ttl : Math.min(ttl, EMPTY_TTL)}` } }));
    // Keep a longer-lived successful snapshot. A transient provider/quota failure must
    // not make confirmed match data disappear from the UI.
    if (result.response.length > 0) await cache?.put(staleKeyFor(path), Response.json(result, { headers: { "Cache-Control": `public, max-age=${STALE_TTL}` } }));
    if (!result.response.length) { const stale = await cache?.match(staleKeyFor(path)); if (stale) { const previous = await stale.json() as {response?:T[];checkedAt?:number}; if (previous.response?.length) return {response:previous.response,checkedAt:previous.checkedAt??0,freshness:"stale"}; } }
    return result;
  })();
  pending.set(path, task);
  try { return await task; } catch(error){
    await recordHealth("football-data-error");
    const stale = await cache?.match(staleKeyFor(path));
    if (stale) {
      const data = await stale.json() as {response?:T[];checkedAt?:number};
      return {response:data.response??[],checkedAt:data.checkedAt??0,freshness:"stale"};
    }
    throw error;
  } finally { pending.delete(path); }
}

export async function footballData<T>(path:string,ttl=1800):Promise<T[]>{return (await footballDataWithMeta<T>(path,ttl)).response;}
