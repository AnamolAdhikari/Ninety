import type { Match } from "@/domain/football/types";
import { formatMatchStatus, matchScore } from "@/features/football/utils/match-formatters";
import { LocalKickoff } from "./local-kickoff";
import { TeamCrest } from "./team-crest";

export function MatchScoreHeader({ match }: { match: Match }) {
  const live = match.status === "LIVE";
  return <header className="mx-auto max-w-4xl py-10 text-center sm:py-14"><div className="mb-7 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[.18em]"><span className={live ? "text-[#ff4d5e]" : "text-[#9ba2aa]"}>{formatMatchStatus(match)}</span><span className="text-white/20">•</span><span className="text-[#9ba2aa]">{match.competition}</span></div><div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-10"><div className="flex min-w-0 flex-col items-center gap-4"><TeamCrest team={match.home} size="large"/><h1 className="max-w-full truncate text-sm font-semibold sm:text-xl">{match.home.name}</h1></div><div><div className="font-mono text-4xl font-semibold tracking-[-.09em] sm:text-6xl">{matchScore(match)}</div>{live && match.minute != null && <p className="mt-2 text-xs font-bold text-[#ff4d5e]">{match.minute}′</p>}</div><div className="flex min-w-0 flex-col items-center gap-4"><TeamCrest team={match.away} size="large"/><h2 className="max-w-full truncate text-sm font-semibold sm:text-xl">{match.away.name}</h2></div></div><p className="mt-8 text-sm text-[#8d949d]"><LocalKickoff kickoff={match.kickoff}/> {match.stage && <>· {match.stage}</>}</p></header>;
}
