"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Play } from "lucide-react";
import type { Match } from "@/domain/football/types";
import { leagueSlug } from "@/features/football/branding/leagues";
import { formatMatchStatus } from "@/features/football/utils/match-formatters";
import { LeagueMark } from "./league-mark";
import { LocalKickoff } from "./local-kickoff";
import { TeamCrest } from "./team-crest";

export function MatchCard({ match }: { match: Match }) {
  const live = match.status === "LIVE";
  return <motion.article whileHover={{ y: -2 }} className={`min-w-0 rounded-2xl border bg-[#12151a] ${match.playableLive === true ? "border-[#c7ff4a]/25 shadow-[0_12px_45px_rgba(199,255,74,.05)]" : "border-white/[.07]"}`}><div className="p-5"><div className="mb-5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#8d949d]"><span className="flex min-w-0 items-center gap-2"><LeagueMark slug={leagueSlug(match.competition)} name={match.competition} size="small"/><span className="truncate">{match.competition}</span></span><span className={`inline-flex shrink-0 items-center gap-1.5 ${live ? "text-[#ff6674]" : ""}`}>{live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"/>}{match.status === "UPCOMING" ? <LocalKickoff kickoff={match.kickoff} includeDay={false}/> : formatMatchStatus(match)}</span></div>{[match.home, match.away].map((team, index) => <div className="mt-3 flex items-center gap-3" key={team.id}><TeamCrest team={team} size="small"/><span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{team.name}</span><span className="font-mono text-2xl font-semibold">{index ? match.awayScore ?? "–" : match.homeScore ?? "–"}</span></div>)}<Link href={`/watch/${encodeURIComponent(match.id)}`} className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)] ${live && match.playableLive === true ? "bg-[var(--lime)] text-[#080a0d]" : "border border-white/10 bg-white/[.04] text-white"}`} aria-label={`${live ? "Watch" : "Open"} ${match.home.name} versus ${match.away.name}${live ? " live" : ""}`}><Play size={15} fill={live ? "currentColor" : "none"}/>{live ? "Watch Live" : "View match"}</Link></div></motion.article>;
}
