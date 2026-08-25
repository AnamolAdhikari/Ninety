import type { Match } from "@/domain/football/types";
import { leagueSlug } from "@/features/football/branding/leagues";
import { formatMatchStatus, matchScore } from "@/features/football/utils/match-formatters";
import { LeagueMark } from "./league-mark";
import { LiveIndicator } from "./live-indicator";
import { LocalKickoff } from "./local-kickoff";
import { TeamCrest } from "./team-crest";

export function MatchScoreHeader({ match }: { match: Match }) { const live = match.status === "LIVE"; return <header className="mx-auto max-w-4xl py-10 text-center sm:py-14"><div className="mb-7 flex flex-wrap items-center justify-center gap-2 text-xs font-bold uppercase tracking-[.18em]">{live ? <LiveIndicator minute={match.minute}/> : <span className="text-[#9ba2aa]">{formatMatchStatus(match)}</span>}<span className="text-white/20">•</span><span className="inline-flex items-center gap-2 text-[#9ba2aa]"><LeagueMark slug={leagueSlug(match.competition)} name={match.competition} size="small"/>{match.competition}</span></div><div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-10"><div className="flex min-w-0 flex-col items-center gap-4"><TeamCrest team={match.home} size="large"/><h1 className="max-w-full text-balance text-sm font-semibold sm:text-xl">{match.home.name}</h1></div><div className="font-mono text-4xl font-semibold tracking-[-.09em] sm:text-6xl">{matchScore(match)}</div><div className="flex min-w-0 flex-col items-center gap-4"><TeamCrest team={match.away} size="large"/><h2 className="max-w-full text-balance text-sm font-semibold sm:text-xl">{match.away.name}</h2></div></div><p className="mt-8 text-sm text-[#8d949d]"><LocalKickoff kickoff={match.kickoff}/> {match.stage && <>· {match.stage}</>}</p></header>; }
