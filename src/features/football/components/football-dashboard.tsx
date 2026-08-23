"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ChevronRight, Radio, Star } from "lucide-react";
import type { FootballDashboardData } from "@/domain/football/types";
import { getFootballDashboard } from "@/features/football/api/football-client";
import { MatchCard } from "./match-card";
import { TeamCrest } from "./team-crest";
import { LocalKickoff } from "./local-kickoff";
import { AppHeader } from "@/features/shell/app-header";
import { FavoriteMatches } from "@/features/personalization/components/favorite-matches";

export function FootballDashboard() {
  const [data, setData] = useState<FootballDashboardData | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => { const controller = new AbortController(); getFootballDashboard(controller.signal).then(setData).catch((e) => { if (e?.name !== "AbortError") setError(true); }); return () => controller.abort(); }, []);
  if (error) return <main className="grid min-h-screen place-items-center px-6 text-center"><div><p className="mb-2 text-2xl font-semibold">We&apos;re off the pitch for a moment.</p><button onClick={() => location.reload()} className="text-[#c7ff4a]">Try again</button></div></main>;
  if (!data) return <div className="mx-auto min-h-screen max-w-[1500px] animate-pulse px-5 pt-24"><div className="h-[430px] rounded-3xl bg-white/[.05]" /></div>;
  const featured = data.featured;
  return <div className="noise min-h-screen pb-24 lg:pb-0">
    <AppHeader/>
    <main className="mx-auto max-w-[1500px] px-5 pt-8 sm:px-8">
      {featured ? <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="relative min-h-[440px] overflow-hidden rounded-[28px] border border-white/[.08] bg-[#11151a] px-6 py-8 sm:px-10 lg:px-14" id="today"><div className="absolute inset-0 opacity-75" style={{ background: `radial-gradient(circle at 88% 18%, ${featured.home.colors[0]}55, transparent 32%), radial-gradient(circle at 60% 90%, ${featured.away.colors[0]}3d, transparent 35%)` }}/><div className="absolute inset-0 bg-gradient-to-r from-[#0c0f13] via-[#0c0f13]/75 to-transparent"/><div className="relative z-10 flex min-h-[375px] flex-col justify-between"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[#c7ff4a]"><span className={`h-2 w-2 rounded-full bg-[#c7ff4a] ${featured.status === "LIVE" ? "animate-pulse" : ""}`}/> {featured.status === "LIVE" ? "Live now" : "Up next"} <span className="text-white/35">•</span> {featured.competition}</div><div className="max-w-2xl"><p className="mb-5 text-sm text-[#a7adb4]">{featured.stage} · <LocalKickoff kickoff={featured.kickoff}/></p><div className="flex items-center gap-4 sm:gap-7"><TeamCrest team={featured.home} size="large"/><span className="font-mono text-4xl font-semibold tracking-[-.08em] sm:text-6xl">{featured.homeScore != null && featured.awayScore != null ? `${featured.homeScore}–${featured.awayScore}` : "v"}</span><TeamCrest team={featured.away} size="large"/></div><h1 className="mt-6 text-2xl font-semibold tracking-[-.04em] sm:text-4xl">{featured.home.name} <span className="text-white/35">vs</span> {featured.away.name}</h1><div className="mt-7"><Link href={`/watch/${encodeURIComponent(featured.id)}`} className="inline-flex items-center gap-2 rounded-full bg-[#c7ff4a] px-5 py-3 text-sm font-bold text-[#080a0d] outline-none focus-visible:ring-2 focus-visible:ring-white"><Radio size={18}/> {featured.status === "LIVE" ? "Follow live" : "View match"}</Link></div></div></div></motion.section> : <section id="today" className="grid min-h-[360px] place-items-center rounded-[28px] border border-white/[.08] bg-[#11151a] px-6 text-center"><div><p className="text-2xl font-semibold">No fixtures on the board yet</p><p className="mt-2 text-sm text-[#8d949d]">Check back soon for the next football window.</p></div></section>}
      <section className="py-10" id="matches"><div className="mb-5 flex items-end justify-between"><div><p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-[#c7ff4a]">Matchday</p><h2 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Your football, today</h2></div><span className="text-sm text-[#9da3ab]">{data.today.length} fixtures</span></div>{data.today.length ? <div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{data.today.map((match) => <MatchCard key={match.id} match={match}/>)}</div> : <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-[#8d949d]">No matches scheduled today.</div>}</section>
      <FavoriteMatches matches={data.matches}/>
      {data.upcoming.length > 0 && <section className="border-t border-white/[.07] py-10"><div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Coming up</h2><span className="text-sm text-[#9da3ab]">Next fixtures</span></div><div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{data.upcoming.slice(0, 8).map((match) => <MatchCard key={match.id} match={match}/>)}</div></section>}
      <section className="border-t border-white/[.07] py-10" id="competitions"><div className="mb-5 flex items-end justify-between"><h2 className="text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Follow the world&apos;s game</h2><Star size={18} className="text-[#8d949d]"/></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.competitions.map((c, i) => <motion.button initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: i * .05 }} key={c.id} className="group flex items-center gap-4 rounded-2xl border border-white/[.07] bg-[#111419] p-4 text-left"><div className="grid h-11 w-11 place-items-center rounded-xl bg-white/[.06] text-sm font-black text-[#c7ff4a]">{c.name.slice(0,2).toUpperCase()}</div><div className="flex-1"><p className="font-semibold">{c.name}</p><p className="mt-1 text-xs text-[#8d949d]">{c.region}</p></div><ChevronRight size={17} className="text-[#555b63]"/></motion.button>)}</div></section>
    </main>
  </div>;
}
