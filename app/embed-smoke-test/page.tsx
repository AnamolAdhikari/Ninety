"use client";

import { useState } from "react";

export default function EmbedSmokeTest() {
  const [draft, setDraft] = useState("");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  function test() {
    try {
      const url = new URL(draft.trim());
      if (url.protocol !== "https:" || !url.hostname || url.username || url.password) throw new Error("Use an HTTPS embed URL without credentials.");
      if (["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Local URLs are not supported.");
      setError("");
      setLoaded(false);
      setSource(url.toString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invalid embed URL");
    }
  }

  return (
    <main className="min-h-screen bg-[#080d15] px-5 py-12 text-white">
      <section className="mx-auto max-w-5xl space-y-5">
        <a href="/" className="text-lime-300">← Back to NINETY</a>
        <h1 className="text-3xl font-bold">Broadcast embed smoke test</h1>
        <p className="text-sm text-slate-300">Isolated player test. Does not add a match or broadcast to the public catalogue. Use only embed URLs you are authorized to display on this domain.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input aria-label="Authorized embed URL" value={draft} onChange={event => setDraft(event.target.value)} placeholder="https://approved-player.example/embed/..." className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900 p-3 text-white" />
          <button onClick={test} className="rounded-lg bg-lime-300 px-5 py-3 font-semibold text-black">Load embed</button>
          <button onClick={() => {setSource("");setDraft("");setLoaded(false);setError("");}} className="rounded-lg border border-slate-600 px-5 py-3">Clear</button>
        </div>
        {error && <p role="alert" className="text-red-300">{error}</p>}
        <div className="aspect-video overflow-hidden rounded-xl border border-slate-700 bg-black">
          {source ? <iframe key={source} src={source} title="Authorized broadcast test player" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" onLoad={() => setLoaded(true)} className="h-full w-full" /> : <div className="flex h-full items-center justify-center text-slate-400">Enter an authorized embed URL to test playback</div>}
        </div>
        {source && <p className="text-sm text-slate-300">Iframe {loaded ? "loaded" : "loading"} — this does not prove video playback. Confirm moving video and audio manually. If blocked, inspect browser Console for frame or CSP errors.</p>}
      </section>
    </main>
  );
}
