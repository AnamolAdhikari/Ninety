interface Env {
  NINETY_BROADCAST_CATALOGUE: KVNamespace;
  CATALOGUE_URL: string;
}
type Event = Record<string, unknown>;
const KEY = "football-catalogue";
const META = "football-catalogue-meta";
const MAX_BYTES = 950_000;
function validUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try { const u = new URL(value); return u.protocol === "https:" && Boolean(u.hostname) && !u.username && !u.password; } catch { return false; }
}
function extract(input: unknown) {
  if (!input || typeof input !== "object") throw Error("invalid-response");
  const streams = (input as {streams?:unknown}).streams;
  if (!Array.isArray(streams)) {
    const root = input as Record<string, unknown>;
    const keys = Object.keys(root).slice(0,12).filter(key => /^[a-zA-Z0-9_-]{1,40}$/.test(key));
    const message = typeof root.message === "string" ? root.message.slice(0,120) : undefined;
    const code = typeof root.code === "string" || typeof root.code === "number" ? String(root.code).slice(0,40) : undefined;
    console.error("catalogue-upstream-shape",JSON.stringify({rootType:Array.isArray(input)?"array":"object",keys,code,message}));
    throw Error("missing-streams");
  }
  const events: Event[] = [];
  for (const group of streams) {
    if (!group || typeof group !== "object") continue;
    const g = group as {category?:unknown;streams?:unknown};
    if (!Array.isArray(g.streams)) continue;
    for (const value of g.streams) {
      if (!value || typeof value !== "object") continue;
      const e = value as Event;
      const category = String(e.category_name || e.category || g.category || "").toLowerCase().trim();
      if (!["football","soccer","association football"].includes(category)) continue;
      const name = e.name || e.title;
      const id = e.id;
      if ((typeof id !== "string" && typeof id !== "number") || typeof name !== "string" || !name.trim()) continue;
      const substreams = Array.isArray(e.substreams) ? e.substreams.filter(s => s && typeof s === "object" && (validUrl((s as Event).iframe) || validUrl((s as Event).embed_url))).slice(0,12) : [];
      if (!validUrl(e.iframe) && !substreams.length) continue;
      events.push({id:String(id),name:name.slice(0,200),category_name:"Football",starts_at:e.starts_at,ends_at:e.ends_at,iframe:validUrl(e.iframe)?e.iframe:undefined,substreams});
    }
  }
  const unique = [...new Map(events.map(e=>[String(e.id),e])).values()];
  if (!unique.length) throw Error("empty-valid-catalogue");
  const body = JSON.stringify({events:unique});
  if (new TextEncoder().encode(body).length > MAX_BYTES) throw Error("catalogue-too-large");
  return {body,count:unique.length};
}
async function refresh(env: Env) {
  const url = new URL(env.CATALOGUE_URL);
  if (url.protocol !== "https:" || url.hostname !== "api.ppv.st" || url.pathname !== "/api/streams") throw Error("unapproved-source");
  const response = await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw Error("upstream-http-"+response.status);
  if (!(response.headers.get("content-type")||"").toLowerCase().includes("json")) throw Error("upstream-not-json");
  const payload: unknown = await response.json();
  const {body,count} = extract(payload);
  const previous = await env.NINETY_BROADCAST_CATALOGUE.get(KEY);
  // Never replace a substantial healthy catalogue with an unexpectedly tiny one.
  if (previous) {
    let priorCount = 0;
    try { priorCount = (JSON.parse(previous) as {events?:unknown[]}).events?.length || 0; } catch {}
    if (priorCount >= 20 && count < Math.floor(priorCount * 0.25)) throw Error("suspicious-catalogue-shrink");
  }
  if (previous !== body) await env.NINETY_BROADCAST_CATALOGUE.put(KEY,body);
  await env.NINETY_BROADCAST_CATALOGUE.put(META,JSON.stringify({checkedAt:new Date().toISOString(),count,changed:previous!==body,status:"ok"}));
  console.log(JSON.stringify({event:"catalogue-refresh",count,changed:previous!==body}));
}
export default {
  async scheduled(_controller: ScheduledController,env:Env,ctx:ExecutionContext) {
    ctx.waitUntil(refresh(env).catch(error=>{console.error("catalogue-refresh-failed",error instanceof Error?error.message:"unknown");}));
  }
};
