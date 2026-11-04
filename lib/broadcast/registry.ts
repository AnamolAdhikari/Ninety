/**
 * Operator-supplied catalogue of authorized broadcast embeds.
 * Set NINETY_BROADCAST_REGISTRY_JSON to JSON with an "events" array.
 * This registry never fetches or scrapes a third-party API.
 */
export type RegistryEvent = {
  id: string;
  name: string;
  category_name: string;
  starts_at?: number;
  ends_at?: number;
  always_live?: boolean;
  iframe?: string;
  substreams?: Array<{id?: string; iframe?: string; source_tag?: string; hd?: boolean}>;
};
function safeUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/\.$/, "");
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) return;
    if (!host.includes(".") || host === "localhost" || /(?:^|\.)(?:localhost|local|internal)$/.test(host)) return;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return;
    const allowed = (process.env.NINETY_BROADCAST_ALLOWED_HOSTS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
    if (!allowed.length || !allowed.includes(host)) return;
    return url.toString();
  } catch { return; }
}
function parseBroadcastRegistry(raw: string | undefined): RegistryEvent[] {
  if (!raw || raw.length > 1_000_000) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("events" in parsed)) return [];
    const items = (parsed as {events?: unknown}).events;
    if (!Array.isArray(items)) return [];
    const ids = new Set<string>();
    return items.slice(0, 1000).flatMap((item): RegistryEvent[] => {
      if (!item || typeof item !== "object") return [];
      const e = item as Record<string, unknown>;
      const id = typeof e.id === "string" ? e.id : "";
      const name = typeof e.name === "string" ? e.name : "";
      if (!id || id.length > 180 || !/^[a-zA-Z0-9._~-]+$/.test(id) || ids.has(id) || !name || name.length > 200) return [];
      const iframe = safeUrl(e.iframe);
      const substreams = (Array.isArray(e.substreams) ? e.substreams : []).slice(0, 12).flatMap((source): NonNullable<RegistryEvent["substreams"]> => {
        if (!source || typeof source !== "object") return [];
        const s = source as Record<string, unknown>;
        const url = safeUrl(s.iframe);
        if (!url) return [];
        return [{id: typeof s.id === "string" ? s.id : undefined, iframe: url, source_tag: typeof s.source_tag === "string" ? s.source_tag.slice(0, 80) : undefined, hd: s.hd === true}];
      });
      if (!iframe && !substreams.length) return [];
      ids.add(id);
      return [{id, name, category_name: typeof e.category_name === "string" ? e.category_name.slice(0, 80) : "Football",
        starts_at: typeof e.starts_at === "number" && Number.isFinite(e.starts_at) ? e.starts_at : undefined,
        ends_at: typeof e.ends_at === "number" && Number.isFinite(e.ends_at) ? e.ends_at : undefined,
        always_live: e.always_live === true, iframe, substreams}];
    });
  } catch { return []; }
}

/** Read the operator-approved remote catalogue, retaining the last secret as fallback. */
export function getBroadcastRegistry(): RegistryEvent[] { return parseBroadcastRegistry(process.env.NINETY_BROADCAST_REGISTRY_JSON); }

export async function getBroadcastRegistryAsync(): Promise<RegistryEvent[]> {
  try {
    const { env } = await import("cloudflare:workers");
    const namespace = (env as unknown as {NINETY_BROADCAST_CATALOGUE?: {get(key:string):Promise<string|null>}}).NINETY_BROADCAST_CATALOGUE;
    if (namespace) {
      const raw = await namespace.get("football-catalogue");
      if (raw && raw.length <= 1_000_000) {
        return parseBroadcastRegistry(raw);
      }
    }
  } catch (error) {
    console.warn("[ninety:broadcast] KV read failed", error instanceof Error ? error.name : "unknown");
  }
  return getBroadcastRegistry();
}
