"use client";
import Link from "next/link";
import { motion } from "motion/react";
import type { Match } from "@/domain/football/types";
import { leagueSlug } from "@/features/football/branding/leagues";
import { formatMatchStatus } from "@/features/football/utils/match-formatters";
import { LeagueMark } from "./league-mark";
import { LocalKickoff } from "./local-kickoff";
import { TeamCrest } from "./team-crest";

export function MatchCard({ match }: { match: Match }) {
  return <motion.article whileHover={{ y: -3 }} className="min-w-[292px] flex-1 rounded-2xl border border-white/[.07] bg-[#12151a] sm:min-w-[330px]"><Link href={`/watch/${encodeURIComponent(match.id)}`} className="block rounded-2xl p-5 outline-none focus-visible:ring-2 focus-visible:ring-[#c7ff4a]" aria-label={`Open ${match.home.name} versus ${match.away.name} match center`}><div className="mb-5 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-[#8d949d]"><span className="flex min-w-0 items-center gap-2"><LeagueMark slug={leagueSlug(match.competition)} name={match.competition} size="small"/><span className="truncate">{match.competition}</span></span><span className={`shrink-0 ${match.status === "LIVE" ? "text-[#ff4d5e]" : ""}`}>{match.status === "UPCOMING" ? <LocalKickoff kickoff={match.kickoff} includeDay={false}/> : formatMatchStatus(match)}</span></div>{[match.home, match.away].map((team, index) => <div className="mt-3 flex items-center gap-3" key={team.id}><TeamCrest team={team} size="small"/><span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{team.name}</span><span className="font-mono text-2xl font-semibold">{index ? match.awayScore ?? "–" : match.homeScore ?? "–"}</span></div>)}</Link></motion.article>;
}
