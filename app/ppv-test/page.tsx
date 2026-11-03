"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Embed = { id: string; label: string; hd: boolean; url: string };
type EventItem = {
  id: string; name: string; category: string; startsAt: number | null;
  endsAt: number | null; alwaysLive: boolean; embeds: Embed[];
};
type Catalogue = { ok: boolean; error?: string; events: EventItem[]; fetchedAt?: number };

function eventState(event: EventItem, now: number) {
  if (event.alwaysLive) return "LIVE";
  const start = event.startsAt ? event.startsAt * 1000 : null;
  const end = event.endsAt ? event.endsAt * 1000 : null;
  if (start !== null && end !== null && now >= start && now <= end) return "LIVE";
  if (start !== null && now < start) return "UPCOMING";
  if (end !== null && now > end) return "ENDED";
  return "SCHEDULED";
}

export default function PpvStandaloneTestPage() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("LIVE");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [selectedEmbed, setSelectedEmbed] = useState(0);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ppv-test", { cache: "no-store" });
      const data = await response.json() as Catalogue;
      if (!response.ok || !data.ok) throw new Error(data.error || "Catalogue request failed");
      setCatalogue(data);
      setSelectedId(current => current && data.events.some(event => event.id === current)
        ? current : (data.events.find(event => eventState(event, Date.now()) === "LIVE" && event.embeds.length)?.id || ""));
      setSelectedEmbed(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load PPV.ST catalogue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const events = useMemo(() => {
    const all = catalogue?.events ?? [];
    return all.filter(event => {
      const state = eventState(event, now);
      const matchesState = filter === "ALL" || state === filter;
      const matchesText = `${event.name} ${event.category}`.toLowerCase().includes(search.toLowerCase());
      return matchesState && matchesText;
    }).sort((a, b) => {
      const rank = (event: EventItem) => eventState(event, now) === "LIVE" ? 0 :
        eventState(event, now) === "UPCOMING" ? 1 : 2;
      return rank(a) - rank(b) || a.name.localeCompare(b.name);
    });
  }, [catalogue, filter, now, search]);

  const selected = catalogue?.events.find(event => event.id === selectedId) ?? null;
  const embed = selected?.embeds[selectedEmbed] ?? null;

  return (
    <main style={{ minHeight: "100vh", background: "#0b1018", color: "#edf2f7", padding: "28px 18px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>NINETY · ISOLATED PROVIDER TEST</div>
            <h1 style={{ fontSize: 28, margin: "8px 0" }}>PPV.ST broadcast test</h1>
            <p style={{ color: "#9aa9bb", margin: 0 }}>Standalone test page. This does not modify or load the production player.</p>
          </div>
          <button onClick={() => void load()} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #344256", background: "#172333", color: "white", cursor: "pointer" }}>
            {loading ? "Refreshing…" : "Refresh events"}
          </button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 380px) minmax(0, 1fr)", gap: 18 }}>
          <section style={{ border: "1px solid #273447", borderRadius: 12, padding: 14, background: "#111a27", alignSelf: "start" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
              {["LIVE", "UPCOMING", "ALL"].map(value => (
                <button key={value} onClick={() => setFilter(value)} style={{ padding: "7px 10px", borderRadius: 7, border: "1px solid #344256", background: filter === value ? "#164e63" : "#172333", color: "white", cursor: "pointer" }}>{value}</button>
              ))}
            </div>
            <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search teams or category" style={{ boxSizing: "border-box", width: "100%", padding: 10, borderRadius: 8, border: "1px solid #344256", background: "#0b1018", color: "white", marginBottom: 12 }} />
            {loading && <p style={{ color: "#9aa9bb" }}>Loading PPV.ST catalogue…</p>}
            {error && <p style={{ color: "#fca5a5" }}>{error}</p>}
            {!loading && !error && events.length === 0 && <p style={{ color: "#9aa9bb" }}>No matching events. Try All or refresh later.</p>}
            <div style={{ display: "grid", gap: 8, maxHeight: 620, overflowY: "auto" }}>
              {events.map(event => {
                const state = eventState(event, now);
                return <button key={event.id} onClick={() => { setSelectedId(event.id); setSelectedEmbed(0); }} style={{ textAlign: "left", padding: 11, borderRadius: 8, border: selectedId === event.id ? "1px solid #38bdf8" : "1px solid #2a394d", background: selectedId === event.id ? "#142b3c" : "#0d1520", color: "white", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>{event.name}</strong><small style={{ color: state === "LIVE" ? "#86efac" : "#a5b4c6" }}>{state}</small>
                  </div>
                  <div style={{ color: "#91a1b5", fontSize: 12, marginTop: 5 }}>{event.category} · {event.embeds.length} embed(s)</div>
                </button>;
              })}
            </div>
          </section>

          <section style={{ minWidth: 0 }}>
            <div style={{ border: "1px solid #273447", borderRadius: 12, padding: 14, background: "#111a27" }}>
              <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{selected?.name ?? "Select an event"}</h2>
              <p style={{ color: "#9aa9bb", fontSize: 13, margin: "0 0 14px" }}>
                {selected ? `${selected.category} · ${eventState(selected, now)} · ${selected.embeds.length} available embed(s)` : "Choose an event from the list to test its provider embed."}
              </p>
              {selected && selected.embeds.length > 1 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {selected.embeds.map((source, index) => <button key={source.url} onClick={() => setSelectedEmbed(index)} style={{ padding: "8px 11px", borderRadius: 7, border: selectedEmbed === index ? "1px solid #38bdf8" : "1px solid #344256", background: selectedEmbed === index ? "#164e63" : "#172333", color: "white", cursor: "pointer" }}>{source.label}{source.hd ? " · HD" : ""}</button>)}
                </div>
              )}
              {embed ? (
                <div style={{ background: "#000", borderRadius: 9, overflow: "hidden", aspectRatio: "16 / 9" }}>
                  <iframe key={embed.url} src={embed.url} title={selected?.name ?? "PPV.ST broadcast"} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ width: "100%", height: "100%", border: 0 }} />
                </div>
              ) : (
                <div style={{ aspectRatio: "16 / 9", display: "grid", placeItems: "center", background: "#05080d", borderRadius: 9, color: "#91a1b5", textAlign: "center", padding: 20 }}>
                  {selected ? "This event currently has no embed URL in the API response." : "The provider player will appear here."}
                </div>
              )}
              {embed && <p style={{ color: "#9aa9bb", fontSize: 12, lineHeight: 1.5 }}>Playback is provided by PPV.ST's own embedded player. Use its native Play control if autoplay is blocked. Ads and provider controls remain intact.</p>}
            </div>
            <div style={{ marginTop: 12, border: "1px solid #273447", borderRadius: 12, padding: 14, background: "#111a27", color: "#9aa9bb", fontSize: 13, lineHeight: 1.6 }}>
              <strong style={{ color: "#edf2f7" }}>Test scope</strong>
              <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                <li>Catalogue reachability and event discovery.</li>
                <li>Presence of provider-supplied iframe URLs and alternate sources.</li>
                <li>Actual playback in this browser, including manual Play, audio and fullscreen.</li>
                <li>No stream extraction, proxying, DRM handling, or production changes.</li>
              </ul>
            </div>
          </section>
        </div>
        <style>{`@media(max-width:760px){main>div>div{grid-template-columns:1fr!important}}`}</style>
      </div>
    </main>
  );
}
