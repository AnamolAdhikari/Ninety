const PPV_API = "https://api.ppv.st/api/streams";

type RawSource = {
  id?: unknown; iframe?: unknown; embed_url?: unknown; tag?: unknown;
  source_tag?: unknown; language?: unknown; locale?: unknown; hd?: unknown;
};
type RawEvent = {
  id?: unknown; name?: unknown; tag?: unknown; iframe?: unknown;
  source_tag?: unknown; uri_name?: unknown; starts_at?: unknown;
  ends_at?: unknown; always_live?: unknown; category_name?: unknown;
  substreams?: RawSource[];
};
type RawGroup = { category?: unknown; category_name?: unknown; streams?: RawEvent[] };
type RawPayload = { success?: unknown; streams?: unknown; READ_ME?: unknown };

function text(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}
function safeEmbedUrl(value: string): string | null {
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.toLowerCase().replace(/\.$/, "");
    if (parsed.protocol !== "https:" || parsed.username || parsed.password) return null;
    if (!host.includes(".") || host === "localhost" || host.endsWith(".localhost") ||
        host.endsWith(".local") || host.endsWith(".internal")) return null;
    if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.includes(":")) return null;
    if (host.length > 253 || !host.split(".").every(label =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
    return parsed.toString();
  } catch { return null; }
}

export async function GET() {
  try {
    const response = await fetch(PPV_API, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; Ninety-PPV-Test/1.0)",
        Referer: "https://ppv.st/",
        Origin: "https://ppv.st",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      return Response.json({ ok: false, error: `PPV.ST API returned HTTP ${response.status}`, events: [] }, { status: 502 });
    }
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      return Response.json({ ok: false, error: "PPV.ST did not return JSON.", events: [] }, { status: 502 });
    }
    const payload = await response.json() as RawPayload;
    if (!Array.isArray(payload.streams)) {
      // Preserve the provider's own diagnostic so we can distinguish access,
      // rate-limit, and upstream availability failures in this isolated test.
      return Response.json({
        ok: false,
        error: "PPV.ST did not return its event catalogue.",
        providerSuccess: payload.success ?? null,
        providerError: typeof payload.error === "string" ? payload.error.slice(0, 500) : null,
        providerKeys: Object.keys(payload),
        events: [],
      }, { status: 502 });
    }

    // PPV.ST returns { success, timestamp, READ_ME, performance, streams },
    // where streams is a list of category groups and each group has streams[].
    const groups = payload.streams as RawGroup[];
    const events = groups.flatMap(group =>
      (Array.isArray(group.streams) ? group.streams : []).map((event: RawEvent) => {
        const sources = [
          { ...event, label: text(event.source_tag) || text(event.tag) || "Main broadcast" },
          ...(Array.isArray(event.substreams) ? event.substreams : []).map(source => ({
            ...source,
            label: text(source.language) || text(source.locale) ||
              text(source.source_tag) || text(source.tag) || "Alternative broadcast",
          })),
        ];
        const seen = new Set<string>();
        const embeds = sources.flatMap((source, index) => {
          const url = safeEmbedUrl(text(source.iframe) || text(source.embed_url));
          if (!url || seen.has(url)) return [];
          seen.add(url);
          return [{
            id: text(source.id) || String(index + 1),
            label: source.label,
            hd: Boolean(source.hd),
            url,
          }];
        });
        return {
          id: text(event.id) || text(event.uri_name),
          name: text(event.name) || text(event.tag) || "Untitled event",
          category: text(event.category_name) || text(group.category_name) || text(group.category) || "Other",
          startsAt: typeof event.starts_at === "number" ? event.starts_at : null,
          endsAt: typeof event.ends_at === "number" ? event.ends_at : null,
          alwaysLive: Number(event.always_live) === 1,
          embeds,
        };
      }).filter(event => event.id)
    );
    return Response.json({ ok: true, events, fetchedAt: Date.now() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ ok: false, error: `Could not reach PPV.ST: ${message}`, events: [] }, { status: 502 });
  }
}
