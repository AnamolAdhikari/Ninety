"use client";
import { useEffect, useMemo, useState } from "react";
import type { FootballDashboardData, Match } from "@/domain/football/types";
import { getFootballDashboard } from "@/features/football/api/football-client";
import { LiveIndicator } from "@/features/football/components/live-indicator";
import { MatchCard } from "@/features/football/components/match-card";
import { usePublishLiveStatus } from "@/features/football/hooks/use-live-status";
import { EmptyState, PageIntro } from "./discovery-ui";

export function LiveContent() {
  const [data, setData] = useState<FootballDashboardData>(); const [failed, setFailed] = useState(false);
  useEffect(() => { const controller = new AbortController(); getFootballDashboard(controller.signal).then((result) => { setData(result); setFailed(false); }).catch((error: Error) => { if (error.name !== "AbortError") setFailed(true); }); return () => controller.abort(); }, []);
  const live = useMemo(() => data ? [data.featured?.status === "LIVE" ? data.featured : null, ...data.live].filter((match): match is Match => match !== null) : [], [data]);
  const soon = useMemo(() => { if (!data || live.length) return []; const unique = new Map<string, Match>(); for (const match of [data.featured, ...data.startingSoon, ...data.today, ...data.upcoming]) if (match?.status === "UPCOMING") unique.set(match.id, match); return [...unique.values()].slice(0, 3); }, [data, live.length]);
  usePublishLiveStatus(data ? live.length > 0 : undefined);
  return <main className="page-shell py-7 sm:py-10"><PageIntro eyebrow="On the pitch" title="Live football" detail={live.length ? `${live.length} ${live.length === 1 ? "match" : "matches"} on air` : "Live now, or the next football you can watch"}/>{failed ? <EmptyState title="Live football temporarily unavailable" copy="Try again in a moment."/> : !data ? <LiveLoading/> : live.length ? <section><div className="mb-5"><LiveIndicator/><h2 className="mt-2 text-2xl font-semibold">Watch now</h2></div><div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{live.map((match) => <MatchCard key={match.id} match={match}/>)}</div></section> : <section className="overflow-hidden rounded-[26px] border border-white/[.08] bg-[#101318]"><div className="border-b border-white/[.07] px-5 py-4 sm:px-6"><h2 className="font-semibold">No live football right now</h2><p className="mt-1 text-sm text-white/45">Here’s what starts next.</p></div>{soon.length > 0 && <div className="p-5 sm:p-6"><p className="mb-1 text-xs font-black uppercase tracking-[.18em] text-[var(--lime)]">Starting soon</p><h2 className="mb-5 text-2xl font-semibold">Next kickoffs</h2><div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">{soon.map((match) => <MatchCard key={match.id} match={match}/>)}</div></div>}</section>}</main>;
}

function LiveLoading() { return <div className="grid gap-4 md:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="skeleton h-52 rounded-2xl"/>)}</div>; }
