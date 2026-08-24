"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Expand, ExternalLink, LoaderCircle, Play, RefreshCw, Radio, TriangleAlert } from "lucide-react";
import type { StreamOption } from "@/domain/stream/types";
import { getStreams, resolveStream } from "@/features/stream/api/stream-client";
import { nextUntriedStream, orderStreams } from "@/features/stream/utils/stream-selection";
import { getIsolatedPlayerLauncher } from "@/features/stream/utils/isolated-player";

type State = "loading-list" | "resolving" | "loaded" | "empty" | "error";
export function StreamPlayer({ matchId, isolatedPlayerOrigin }: { matchId: string; isolatedPlayerOrigin?: string }) {
  const [streams, setStreams] = useState<StreamOption[]>([]); const [selected, setSelected] = useState<string>(); const [embedUrl, setEmbedUrl] = useState<string>(); const [state, setState] = useState<State>("loading-list"); const [message, setMessage] = useState("Preparing stream"); const attempted = useRef(new Set<string>()); const frame = useRef<HTMLDivElement>(null);
  const preferenceKey = `ninety.stream.preference.${matchId}`;
  const resolveWithFailover = useCallback(async (ordered: StreamOption[], initialId: string, signal?: AbortSignal) => { let current = ordered.find((stream) => stream.id === initialId); while (current) { attempted.current.add(current.id); setSelected(current.id); setState("resolving"); try { const playback = await resolveStream(matchId, current.id, signal); setEmbedUrl(playback.embedUrl); setState("loaded"); localStorage.setItem(preferenceKey, current.id); return; } catch { current = nextUntriedStream(ordered, attempted.current); if (current) setMessage("Trying another stream…"); } } setEmbedUrl(undefined); setState("error"); }, [matchId, preferenceKey]);
  useEffect(() => { const controller = new AbortController(); (async () => { try { const result = await getStreams(matchId, controller.signal); if (!result.streams.length) { setState("empty"); return; } const ordered = orderStreams(result.streams, localStorage.getItem(preferenceKey)); setStreams(ordered); await resolveWithFailover(ordered, ordered[0].id, controller.signal); } catch (error) { if ((error as Error).name !== "AbortError") setState("error"); } })(); return () => controller.abort(); }, [matchId, preferenceKey, resolveWithFailover]);
  const choose = (id: string) => { attempted.current = new Set(); setMessage("Preparing stream"); void resolveWithFailover(streams, id); };
  const retry = () => { attempted.current = new Set(); setMessage("Preparing stream"); const candidate = streams.find((stream) => stream.id === selected) ?? streams[0]; if (candidate) void resolveWithFailover(streams, candidate.id); else setState("empty"); };
  const fullscreen = () => { void frame.current?.requestFullscreen?.(); };
  const isolatedPlayer = streams.length ? getIsolatedPlayerLauncher(process.env.NODE_ENV, matchId, isolatedPlayerOrigin) : null;
  return <section aria-label="Football stream player">
    <div ref={frame} className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[.08] bg-black shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:rounded-[26px]">
      {embedUrl && (
        <iframe key={embedUrl} src={embedUrl} title="Football match stream" className="absolute inset-0 h-full w-full border-0" sandbox="allow-scripts allow-same-origin" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer" onLoad={() => setState("loaded")}/>
      )}
      {state !== "loaded" && (
        <PlayerState state={state} message={message} retry={retry} tryAnother={() => { const next = nextUntriedStream(streams, attempted.current); if (next) choose(next.id); }}/>
      )}
      <button type="button" onClick={fullscreen} className="absolute bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/65 text-white outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-[#c7ff4a]" aria-label="Enter fullscreen"><Expand size={18}/></button>
    </div>
    {streams.length > 0 && <div className="mt-4 rounded-2xl border border-white/[.07] bg-[#111419] p-3 sm:flex sm:items-center sm:gap-4">
      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#727982] sm:pb-0">Stream</p>
      <div className="flex flex-1 gap-2 overflow-x-auto">{streams.map((stream, index) => <button type="button" key={stream.id} onClick={() => choose(stream.id)} aria-pressed={selected === stream.id} className={`min-h-11 min-w-fit rounded-xl border px-4 text-left text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#c7ff4a] ${selected === stream.id ? "border-[#c7ff4a]/40 bg-[#c7ff4a]/10 text-white" : "border-white/[.07] text-[#9aa1a9] hover:bg-white/[.04]"}`}><span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${selected === stream.id ? "bg-[#c7ff4a]" : "bg-white/20"}`}/>{stream.language ?? `Source ${index + 1}`} {stream.quality && <span className="text-xs text-white/35">· {stream.quality}</span>}</span></button>)}</div>
      {isolatedPlayer && <a href={isolatedPlayer.href} target={isolatedPlayer.target} rel={isolatedPlayer.rel} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#c7ff4a]/25 bg-[#c7ff4a]/8 px-4 text-xs font-bold text-[#c7ff4a] sm:mt-0"><ExternalLink size={14}/>Open secure player {process.env.NODE_ENV === "development" && <span className="text-[9px] uppercase tracking-wider text-white/35">Dev</span>}</a>}
    </div>}
  </section>;
}

function PlayerState({ state, message, retry, tryAnother }: { state: State; message: string; retry: () => void; tryAnother: () => void }) { const loading = state === "loading-list" || state === "resolving"; return <div className="absolute inset-0 z-10 grid place-items-center bg-[radial-gradient(circle_at_center,rgba(55,67,79,.25),#020203_62%)] px-6 text-center"><div>{loading ? <LoaderCircle className="mx-auto animate-spin text-[#c7ff4a]" size={28}/> : state === "empty" ? <Radio className="mx-auto text-[#69717a]" size={28}/> : <TriangleAlert className="mx-auto text-[#ff6674]" size={28}/>}<p className="mt-4 text-sm font-semibold">{loading ? message : state === "empty" ? "No live stream is currently available for this match." : "Stream temporarily unavailable"}</p>{state === "error" && <><p className="mt-2 text-xs text-white/40">Try another source or retry in a moment.</p><div className="mt-5 flex justify-center gap-2"><button onClick={retry} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-black"><RefreshCw size={14}/> Retry</button><button onClick={tryAnother} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-bold"><Play size={14}/> Try another source</button></div></>}</div></div>; }
