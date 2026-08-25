"use client";
import Link from "next/link";
import { motion } from "motion/react";
import { Play } from "lucide-react";
import type { Match } from "@/domain/football/types";
import { leagueSlug } from "@/features/football/branding/leagues";
import { formatMatchStatus } from "@/features/football/utils/match-formatters";
import { LeagueMark } from "./league-mark";
import { TeamCrest } from "./team-crest";
import { LiveIndicator } from "./live-indicator";
import { KickoffProximity } from "./kickoff-proximity";

export function MatchCard({ match, showCompetition = true }: { match: Match; showCompetition?: boolean }) {
  const live = match.status === "LIVE";
  const watchable = live && match.playableLive === true;
  return <motion.article whileHover={{ y: -2 }} className={`h-full min-w-0 rounded-2xl border bg-[#12151a] ${watchable ? "border-[#ff5969]/25 shadow-[0_12px_45px_rgba(255,89,105,.05)]" : "border-white/[.07]"}`}><div className="flex h-full flex-col p-5"><div className="mb-5 flex min-h-7 items-start justify-between gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#8d949d]">{showCompetition ? <span className="flex min-w-0 items-center gap-2"><LeagueMark slug={leagueSlug(match.competition)} name={match.competition} size="small"/><span className="line-clamp-2">{match.competition}</span></span> : <span/>}{live ? <LiveIndicator minute={match.minute} compact/> : match.status === "UPCOMING" ? <span className="shrink-0 normal-case tracking-normal"><KickoffProximity kickoff={match.kickoff}/></span> : <span>{formatMatchStatus(match)}</span>}</div>{[match.home, match.away].map((team, index) => <div className="mt-3 flex min-h-10 items-center gap-3" key={team.id}><TeamCrest team={team} size="small"/><span className="min-w-0 flex-1 text-[15px] font-semibold leading-tight">{team.name}</span><span className="font-mono text-2xl font-semibold">{index ? match.awayScore ?? "–" : match.homeScore ?? "–"}</span></div>)}<Link href={`/watch/${encodeURIComponent(match.id)}`} className={`mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--lime)] ${watchable ? "bg-[var(--lime)] text-[#080a0d]" : "border border-white/10 bg-white/[.04] text-white"}`} aria-label={`${watchable ? "Watch" : "View"} ${match.home.name} versus ${match.away.name}${live ? " live" : ""}`}><Play size={15} fill={watchable ? "currentColor" : "none"}/>{watchable ? "Watch Live" : "View Match"}</Link></div></motion.article>;
}
