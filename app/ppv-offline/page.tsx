"use client";

import { useMemo, useState } from "react";

type EventItem = {
  id: string; name: string; category: string; startsAt: number | null;
  endsAt: number | null; alwaysLive: boolean;
  sources: Array<{ id: string; label: string; hasEmbed: boolean }>;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : "";
}
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function parseCatalogue(value: unknown): EventItem[] {
  const root = asRecord(value);
  if (!root || !Array.isArray(root.streams)) throw new Error("Expected PPV.ST JSON containing a streams array.");
  const events: EventItem[] = [];
  for (const rawGroup of root.streams) {
    const group = asRecord(rawGroup);
    if (!group || !Array.isArray(group.streams)) continue;
    for (const rawEvent of group.streams) {
      const event = asRecord(rawEvent);
      if (!event) continue;
      const id = asText(event.id) || asText(event.uri_name);
      if (!id) continue;
      const rawSources = [event, ...(Array.isArray(event.substreams) ? event.substreams : [])];
      const sources = rawSources.flatMap((rawSource, index) => {
        const source = asRecord(rawSource);
        if (!source) return [];
        return [{
          id: asText(source.id) || String(index + 1),
          label: asText(source.source_tag) || asText(source.tag) || asText(source.locale) || "Broadcast",
          hasEmbed: Boolean(asText(source.iframe) || asText(source.embed_url)),
        }];
      });
      events.push({
        id,
        name: asText(event.name) || "Untitled event",
        category: asText(event.category_name) || asText(group.category) || "Other",
        startsAt: typeof event.starts_at === "number" ? event.starts_at : null,
        endsAt: typeof event.ends_at === "number" ? event.ends_at : null,
        alwaysLive: event.always_live === 1 || event.always_live === true,
        sources,
      });
    }
  }
  return events;
}
function state(event: EventItem, now: number): string {
  if (event.alwaysLive) return "LIVE / 24-7";
  if (event.startsAt && event.endsAt && now >= event.startsAt * 1000 && now <= event.endsAt * 1000) return "LIVE";
  if (event.startsAt && now < event.startsAt * 1000) return "UPCOMING";
  if (event.endsAt && now > event.endsAt * 1000) return "ENDED";
  return "SCHEDULED";
}

export default function OfflinePpvTest() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [now] = useState(() => Date.now());
  const categories = useMemo(() => ["All", ...new Set(events.map(event => event.category))].sort(), [events]);
  const visible = useMemo(() => events.filter(event =>
    (category === "All" || event.category === category) &&
    (event.name + " " + event.category).toLowerCase().includes(search.toLowerCase())
  ), [events, category, search]);
  const selected = events.find(event => event.id === selectedId);
  const totalSources = events.reduce((total, event) => total + event.sources.length, 0);
  const withEmbed = events.filter(event => event.sources.some(source => source.hasEmbed)).length;

  async function load(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 15_000_000) throw new Error("File exceeds 15 MB. Select the saved catalogue JSON.");
      const data = JSON.parse(await file.text()) as unknown;
      const parsed = parseCatalogue(data);
      setEvents(parsed);
      setFilename(file.name);
      setCategory("All");
      setSelectedId(parsed[0]?.id || "");
    } catch (err) {
      setEvents([]);
      setFilename("");
      setSelectedId("");
      setError(err instanceof Error ? err.message : "Unable to parse JSON.");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b1018", color: "#edf2f7", fontFamily: "Arial, sans-serif", padding: "30px 18px" }}>
      <div style={{ maxWidth: 1120, margin: "auto" }}>
        <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: 2 }}>NINETY · OFFLINE PROVIDER TEST</div>
        <h1>PPV.ST catalogue validation</h1>
        <p style={{ color: "#9aa9bb" }}>Select the JSON already saved on your Mac. Parsing happens entirely in your browser: no upload, API calls, embeds or video requests.</p>
        <label style={{ display: "block", padding: 18, border: "1px dashed #49617b", borderRadius: 10, margin: "20px 0", background: "#111a27" }}>
          <strong>Choose saved ppv-response.json</strong>
          <input aria-label="Choose PPV.ST catalogue JSON" type="file" accept=".json,application/json" onChange={event => void load(event.target.files?.[0])} style={{ display: "block", marginTop: 12 }} />
          {filename && <p style={{ color: "#86efac" }}>Loaded locally: {filename}</p>}
          {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
        </label>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 18 }}>
          {[["Events", events.length], ["Categories", new Set(events.map(event => event.category)).size], ["Broadcast options", totalSources], ["Events with embed metadata", withEmbed]].map(([label, count]) =>
            <div key={label} style={{ flex: "1 1 180px", background: "#111a27", border: "1px solid #273447", borderRadius: 10, padding: 14 }}>
              <div style={{ color: "#9aa9bb", fontSize: 12 }}>{label}</div><strong style={{ fontSize: 24 }}>{count}</strong>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 380px) minmax(0, 1fr)", gap: 16 }}>
          <section style={{ background: "#111a27", border: "1px solid #273447", borderRadius: 10, padding: 14 }}>
            <input placeholder="Search events" value={search} onChange={event => setSearch(event.target.value)} style={{ width: "100%", boxSizing: "border-box", background: "#0b1018", border: "1px solid #344256", borderRadius: 6, padding: 10, color: "white", marginBottom: 10 }} />
            <select aria-label="Category" value={category} onChange={event => setCategory(event.target.value)} style={{ width: "100%", background: "#0b1018", color: "white", padding: 10, borderRadius: 6, marginBottom: 12 }}>
              {categories.map(item => <option key={item}>{item}</option>)}
            </select>
            <p style={{ color: "#9aa9bb", fontSize: 12 }}>{visible.length} matching events</p>
            <div style={{ display: "grid", gap: 7, maxHeight: 550, overflowY: "auto" }}>
              {visible.map(event => <button key={event.id} onClick={() => setSelectedId(event.id)} style={{ textAlign: "left", border: selectedId === event.id ? "1px solid #38bdf8" : "1px solid #344256", borderRadius: 7, background: "#0b1018", color: "white", padding: 10, cursor: "pointer" }}>
                <strong>{event.name}</strong><div style={{ color: "#9aa9bb", fontSize: 12, marginTop: 5 }}>{event.category} · {state(event, now)}</div>
              </button>)}
            </div>
          </section>
          <section style={{ background: "#111a27", border: "1px solid #273447", borderRadius: 10, padding: 18 }}>
            <h2>{selected?.name || "Select an event"}</h2>
            {selected ? <>
              <p style={{ color: "#9aa9bb" }}>{selected.category} · {state(selected, now)} · Event ID {selected.id}</p>
              <h3>Broadcast metadata</h3>
              {selected.sources.map(source => <div key={source.id} style={{ borderBottom: "1px solid #344256", padding: "12px 0" }}>
                <strong>{source.label}</strong><div style={{ color: source.hasEmbed ? "#86efac" : "#fca5a5", fontSize: 13 }}>{source.hasEmbed ? "Embed URL present in saved JSON" : "No embed URL"}</div>
              </div>)}
              <p style={{ color: "#9aa9bb", fontSize: 13, marginTop: 22 }}>Offline validation does not play broadcasts. Embed availability is metadata only, not evidence of working playback or authorization.</p>
            </> : <p style={{ color: "#9aa9bb" }}>Choose a local catalogue JSON file to inspect its events.</p>}
          </section>
        </div>
        <style>{`@media(max-width:760px){main>div>div:last-of-type{grid-template-columns:1fr!important}}`}</style>
      </div>
    </main>
  );
}
