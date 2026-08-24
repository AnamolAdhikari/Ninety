"use client";
import { FormEvent, useRef, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";

export function PlaybackDiagnosticForm() {
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const launch = useRef<HTMLAnchorElement>(null);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(undefined); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/dev/playback-diagnostic", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watchUrl: form.get("watchUrl") }) });
      const payload = await response.json() as { launchUrl?: string; error?: string };
      if (!response.ok || !payload.launchUrl) throw new Error(payload.error ?? "Could not prepare isolated playback.");
      if (launch.current) { launch.current.href = payload.launchUrl; launch.current.click(); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare isolated playback."); }
    finally { setLoading(false); }
  };
  return <form onSubmit={submit} className="mt-8 rounded-3xl border border-white/[.08] bg-[#111419] p-5 sm:p-7">
    <label htmlFor="watch-url" className="text-xs font-bold uppercase tracking-[.16em] text-white/50">Provider watch URL</label>
    <input id="watch-url" name="watchUrl" type="url" required placeholder="https://streamed.pk/watch/..." className="mt-3 min-h-12 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-[#c7ff4a]/50"/>
    <button type="submit" disabled={loading} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#c7ff4a] px-5 text-sm font-extrabold text-black disabled:opacity-60">{loading ? <LoaderCircle className="animate-spin" size={17}/> : <ExternalLink size={17}/>}Prepare isolated playback</button>
    {error && <p role="alert" className="mt-4 text-sm text-[#ff7b89]">{error}</p>}
    <a ref={launch} target="_blank" rel="noopener noreferrer" className="sr-only">Open isolated player</a>
  </form>;
}
