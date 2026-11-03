"use client";

import { useMemo, useState } from "react";

type Source = { id: string; label: string; iframe: string };
type EventItem = { id: string; name: string; category: string; alwaysLive: boolean; startsAt: number; endsAt: number; sources: Source[] };
function obj(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
function str(value: unknown): string { return typeof value === "string" ? value : typeof value === "number" ? String(value) : ""; }
function safeEmbed(value: unknown): string {
  const raw = str(value);
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return "";
    return url.href;
  } catch { return ""; }
}
function parse(value: unknown): EventItem[] {
  const root = obj(value);
  if (!root || !Array.isArray(root.streams)) throw new Error("Expected PPV.ST catalogue JSON with streams array.");
  const result: EventItem[] = [];
  for (const item of root.streams) {
    const group = obj(item);
    if (!group || !Array.isArray(group.streams)) continue;
    for (const entry of group.streams) {
      const event = obj(entry);
      if (!event) continue;
      const id = str(event.id) || str(event.uri_name);
      if (!id) continue;
      const sources: Source[] = [];
      for (const [index, raw] of [event, ...(Array.isArray(event.substreams) ? event.substreams : [])].entries()) {
        const source = obj(raw);
        if (!source) continue;
        const iframe = safeEmbed(source.iframe || source.embed_url);
        if (iframe) sources.push({ id: str(source.id) || String(index), label: str(source.source_tag) || str(source.tag) || "Source " + (index + 1), iframe });
      }
      result.push({
        id, name: str(event.name) || "Unnamed event",
        category: str(event.category_name) || str(group.category) || "Other",
        alwaysLive: event.always_live === 1 || event.always_live === true,
        startsAt: typeof event.starts_at === "number" ? event.starts_at : 0,
        endsAt: typeof event.ends_at === "number" ? event.ends_at : 0,
        sources,
      });
    }
  }
  return result;
}
const field: React.CSSProperties = { background: "#0a101a", border: "1px solid #344256", borderRadius: 7, padding: 10, color: "#f8fafc", width: "100%", boxSizing: "border-box" };
const panel: React.CSSProperties = { background: "#121c2b", border: "1px solid #28384d", borderRadius: 12, padding: 18 };
export default function PpvPlaybackTest() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [playing, setPlaying] = useState(false);
  const [now] = useState(() => Date.now());
  const filtered = useMemo(() => events.filter(e => (e.name + " " + e.category).toLowerCase().includes(search.toLowerCase())), [events, search]);
  const selected = events.find(e => e.id === selectedId);
  const source = selected?.sources.find(s => s.id === sourceId);
  function selectEvent(event: EventItem) {
    setPlaying(false);
    setSelectedId(event.id);
    setSourceId(event.sources[0]?.id || "");
  }
  async function load(file?: File) {
    if (!file) return;
    setError(""); setPlaying(false);
    try {
      if (file.size > 15_000_000) throw new Error("File too large (15 MB limit).");
      const parsed = parse(JSON.parse(await file.text()) as unknown);
      setEvents(parsed); setFilename(file.name);
      setSelectedId(parsed[0]?.id || ""); setSourceId(parsed[0]?.sources[0]?.id || "");
    } catch (err) {
      setEvents([]); setFilename(""); setSelectedId(""); setSourceId("");
      setError(err instanceof Error ? err.message : "Invalid JSON.");
    }
  }
  const status = (event: EventItem) => event.alwaysLive ? "24/7" : event.startsAt * 1000 <= now && now <= event.endsAt * 1000 ? "LIVE" : event.startsAt * 1000 > now ? "UPCOMING" : "ENDED";
  return <main style={{ minHeight: "100vh", background: "#0a101a", color: "#f1f5f9", padding: "28px 18px", fontFamily: "Arial, sans-serif" }}>
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: 2 }}>NINETY · ISOLATED BROADCAST TEST</div>
      <h1>PPV.ST playback verification</h1>
      <p style={{ color: "#aab8c9" }}>Load your saved catalogue locally, choose a broadcast, then click Play. No catalogue API requests, no stream proxy, and no production changes. Playing an embed contacts its provider.</p>
      <section style={{ ...panel, margin: "20px 0" }}>
        <label htmlFor="ppv-json">Saved catalogue JSON</label>
        <input id="ppv-json" type="file" accept=".json,application/json" onChange={e => void load(e.target.files?.[0])} style={{ display: "block", marginTop: 12 }} />
        {filename && <p style={{ color: "#86efac" }}>Loaded {filename}: {events.length} events, {events.reduce((n,e)=>n+e.sources.length,0)} embeddable sources</p>}
        {error && <p role="alert" style={{ color: "#fca5a5" }}>{error}</p>}
      </section>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 16 }}>
        <section style={panel}>
          <input aria-label="Search events" placeholder="Search events or categories" value={search} onChange={e=>setSearch(e.target.value)} style={field}/>
          <p style={{ fontSize: 12, color: "#aab8c9" }}>{filtered.length} matches</p>
          <div style={{ maxHeight: 640, overflowY: "auto", display: "grid", gap: 8 }}>
            {filtered.map(e => <button key={e.id} onClick={()=>selectEvent(e)} style={{ ...field, textAlign: "left", cursor: "pointer", borderColor: selectedId===e.id ? "#38bdf8" : "#344256" }}>
              <strong>{e.name}</strong><div style={{ fontSize: 12, color: "#aab8c9", marginTop: 5 }}>{e.category} · {status(e)} · {e.sources.length} embeds</div>
            </button>)}
          </div>
        </section>
        <section style={panel}>
          <h2 style={{ marginTop: 0 }}>{selected?.name || "Select a broadcast"}</h2>
          {selected && <>
            <p style={{ color: "#aab8c9" }}>{selected.category} · {status(selected)}</p>
            <label htmlFor="ppv-source">Broadcast source</label>
            <select id="ppv-source" style={{ ...field, marginTop: 8 }} value={sourceId} onChange={e=>{setPlaying(false);setSourceId(e.target.value);}}>
              {selected.sources.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
              <button disabled={!source} onClick={()=>setPlaying(true)} style={{ ...field, width: "auto", background: "#c9ff39", color: "#0a101a", fontWeight: 700, cursor: "pointer" }}>Play selected embed</button>
              <button onClick={()=>setPlaying(false)} style={{ ...field, width: "auto", cursor: "pointer" }}>Stop / unload</button>
            </div>
            <div style={{ aspectRatio: "16 / 9", background: "#000", borderRadius: 9, overflow: "hidden", display: "grid", placeItems: "center" }}>
              {playing && source ? <iframe key={source.iframe} src={source.iframe} title={selected.name + " - " + source.label} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }}/> : <p style={{ color: "#9ca3af" }}>Player unloaded. Choose a source and press Play.</p>}
            </div>
            <p style={{ fontSize: 12, color: "#aab8c9" }}>An iframe loading does not prove video playback. Verify moving video, sound and fullscreen manually. The provider may block embedding or playback.</p>
          </>}
        </section>
      </div>
    </div>
  </main>;
}
