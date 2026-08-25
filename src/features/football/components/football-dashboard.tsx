"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import type { FootballDashboardData, Match } from "@/domain/football/types";
import { getFootballDashboard } from "@/features/football/api/football-client";
import { LocalKickoff } from "./local-kickoff";
import { MatchCard } from "./match-card";
import { TeamCrest } from "./team-crest";

export function FootballDashboard({ data: initialData }: { data?: FootballDashboardData }) {
  const [data, setData] = useState(initialData);
  const [failed, setFailed] = useState(false);
  const load = async (signal?: AbortSignal) => { try { setData(await getFootballDashboard(signal)); } catch (error) { if ((error as Error).name !== "AbortError") setFailed(true); } };
  useEffect(() => { if (initialData) return; const controller = new AbortController(); getFootballDashboard(controller.signal).then(setData).catch((error: Error) => { if (error.name !== "AbortError") setFailed(true); }); return () => controller.abort(); }, [initialData]);
  if (!data) return failed ? <LoadFailure retry={() => { setFailed(false); void load(); }}/> : <DashboardLoading/>;
  const hasLive = Boolean(data.featured || data.live.length);
  return <div className="noise min-h-screen pb-24 md:pb-0"><main className="page-shell py-5 sm:py-8">
    <div className="mb-5 flex items-end justify-between gap-4"><div><div className={`mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] ${hasLive ? "text-[#ff6674]" : "text-[var(--lime)]"}`}><span className={`h-2 w-2 rounded-full ${hasLive ? "animate-pulse bg-[#ff5969]" : "bg-[var(--lime)]"}`}/>{hasLive ? "Live football" : "Starting soon"}</div><h1 className="text-3xl font-semibold tracking-[-.055em] sm:text-5xl">What can I watch now?</h1></div><Link href="/live" className="hidden min-h-11 items-center rounded-full border border-white/10 px-4 text-sm font-bold text-white sm:inline-flex">All live</Link></div>
    {data.featured ? <FeaturedLive match={data.featured}/> : data.startingSoon[0] ? <SoonLead match={data.startingSoon[0]}/> : null}
    <MatchSection eyebrow="On air" title="Live now" matches={data.live} empty={hasLive ? undefined : "No matches are live right now."}/>
    <MatchSection eyebrow="Next kickoff" title="Starting soon" matches={data.startingSoon.filter((match) => match.id !== (!data.featured ? data.startingSoon[0]?.id : ""))}/>
    <MatchSection eyebrow="Matchday" title="Today’s football" matches={data.today}/>
    <MatchSection eyebrow="On the horizon" title="Upcoming" matches={data.upcoming.slice(0, 9)}/>
  </main></div>;
}

function FeaturedLive({ match }: { match: Match }) { return <section aria-label="Most watched live" className="relative overflow-hidden rounded-[26px] border border-[var(--lime)]/20 bg-[#11151a] p-6 shadow-[0_24px_80px_rgba(0,0,0,.38)] sm:p-9"><div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 92% 10%, ${match.home.colors[0]}55, transparent 38%),radial-gradient(circle at 65% 100%,${match.away.colors[0]}35,transparent 42%)` }}/><div className="relative"><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--lime)]">Most watched · Live</p><p className="mt-3 text-sm text-white/55">{match.competition} · {match.minute ? `${match.minute}′` : match.stage}</p><div className="mt-6 flex items-center gap-4 sm:gap-6"><TeamCrest team={match.home} size="large"/><span className="font-mono text-3xl font-bold sm:text-5xl">{match.homeScore != null ? `${match.homeScore}–${match.awayScore}` : "v"}</span><TeamCrest team={match.away} size="large"/></div><h2 className="mt-5 max-w-3xl text-2xl font-semibold tracking-[-.045em] sm:text-4xl">{match.home.name} <span className="text-white/35">vs</span> {match.away.name}</h2><Link href={`/watch/${encodeURIComponent(match.id)}`} aria-label={`Watch ${match.home.name} versus ${match.away.name} live`} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--lime)] px-6 text-sm font-black text-[#080a0d]"><Radio size={18}/>Watch Live</Link></div></section>; }
function SoonLead({ match }: { match: Match }) { return <section className="rounded-[26px] border border-white/[.08] bg-[#11151a] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-[var(--lime)]">Starting soon · <LocalKickoff kickoff={match.kickoff}/></p><h2 className="mt-4 text-2xl font-semibold">{match.home.name} <span className="text-white/35">vs</span> {match.away.name}</h2><p className="mt-2 text-sm text-white/50">{match.competition}</p><Link href={`/watch/${encodeURIComponent(match.id)}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 text-sm font-black text-black">Open match</Link></section>; }
function MatchSection({ eyebrow, title, matches, empty }: { eyebrow: string; title: string; matches: Match[]; empty?: string }) { if (!matches.length && !empty) return null; return <section className="border-b border-white/[.07] py-8 last:border-0"><div className="mb-5"><p className="text-[11px] font-black uppercase tracking-[.18em] text-[var(--lime)]">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">{title}</h2></div>{matches.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{matches.map((match) => <MatchCard key={match.id} match={match}/>)}</div> : <p className="rounded-2xl border border-dashed border-white/10 p-7 text-sm text-white/50">{empty}</p>}</section>; }
function DashboardLoading() { return <main className="page-shell py-6" aria-label="Loading live football"><div className="skeleton h-4 w-28 rounded"/><div className="skeleton mt-4 h-10 w-80 max-w-full rounded"/><div className="skeleton mt-6 aspect-[16/8] max-h-[390px] rounded-[26px]"/><div className="mt-8 grid gap-3 md:grid-cols-3">{[1,2,3].map((item) => <div key={item} className="skeleton h-48 rounded-2xl"/>)}</div></main>; }
function LoadFailure({ retry }: { retry: () => void }) { return <main className="page-shell grid min-h-[65vh] place-items-center text-center"><div><h1 className="text-2xl font-semibold">Live football is temporarily unavailable</h1><button onClick={retry} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-black"><RefreshCw size={16}/>Try again</button></div></main>; }
