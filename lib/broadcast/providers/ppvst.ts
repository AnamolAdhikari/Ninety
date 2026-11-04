/**
 * Normalized broadcast metadata for the Ninety player.
 * This module does not fetch, proxy, or extract media.
 */
export type BroadcastSource = {
  id: string;
  label: string;
  embedUrl: string;
};
export type BroadcastEvent = {
  id: string;
  title: string;
  category: string;
  startsAt: number | null;
  endsAt: number | null;
  alwaysLive: boolean;
  sources: BroadcastSource[];
};
export type BroadcastCatalogue = {
  provider: "ppvst";
  events: BroadcastEvent[];
};
type RecordValue = Record<string, unknown>;
const record = (v: unknown): RecordValue | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as RecordValue : null;
const string = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const unix = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

/** Only permit explicitly approved provider embed hosts. */
export function validateBroadcastEmbed(value: unknown, approvedHosts: readonly string[]): string | null {
  try {
    const url = new URL(string(value));
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!approvedHosts.some(host => url.hostname.toLowerCase() === host.toLowerCase())) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Parse a saved or otherwise authorized catalogue without making any network requests. */
export function parsePpvstCatalogue(input: unknown, approvedHosts: readonly string[]): BroadcastCatalogue {
  const root = record(input);
  if (!root || root.success !== true || !Array.isArray(root.streams)) {
    throw new Error("Invalid or unsuccessful broadcast catalogue");
  }
  const events: BroadcastEvent[] = [];
  const eventIds = new Set<string>();
  for (const rawGroup of root.streams) {
    const group = record(rawGroup);
    if (!group || !Array.isArray(group.streams)) continue;
    for (const rawEvent of group.streams) {
      const event = record(rawEvent);
      if (!event) continue;
      const id = string(event.id) || string(event.uri_name);
      if (!id || eventIds.has(id)) continue;
      const rawSources = [event, ...(Array.isArray(event.substreams) ? event.substreams : [])];
      const sources: BroadcastSource[] = [];
      const urls = new Set<string>();
      for (const [index, rawSource] of rawSources.entries()) {
        const source = record(rawSource);
        if (!source) continue;
        const embedUrl = validateBroadcastEmbed(source.iframe ?? source.embed_url, approvedHosts);
        if (!embedUrl || urls.has(embedUrl)) continue;
        urls.add(embedUrl);
        sources.push({
          id: string(source.id) || String(index),
          label: string(source.source_tag) || string(source.tag) || `Source ${index + 1}`,
          embedUrl,
        });
      }
      eventIds.add(id);
      events.push({
        id,
        title: string(event.name) || "Untitled event",
        category: string(event.category_name) || string(group.category) || "Other",
        startsAt: unix(event.starts_at),
        endsAt: unix(event.ends_at),
        alwaysLive: event.always_live === true || event.always_live === 1,
        sources,
      });
    }
  }
  return { provider: "ppvst", events };
}

export function broadcastStatus(event: BroadcastEvent, nowSeconds: number): "live" | "upcoming" | "ended" | "unknown" {
  if (event.alwaysLive) return "live";
  if (event.startsAt === null || event.endsAt === null) return "unknown";
  if (nowSeconds < event.startsAt) return "upcoming";
  if (nowSeconds <= event.endsAt) return "live";
  return "ended";
}
