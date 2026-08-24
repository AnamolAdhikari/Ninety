import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Competition } from "@/domain/football/types";
import { orderedWorldCompetitions } from "@/domain/football/competition-order";
import { LeagueMark } from "@/features/football/components/league-mark";

export function CompetitionNavigation({ competitions }: { competitions: Competition[] }) {
  if (!competitions.length) return null;
  return <section className="border-y border-white/[.07] py-9" data-section="competition-navigation"><div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--lime)]">Competition discovery</p><h2 className="mt-1 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Follow the world&apos;s game</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{orderedWorldCompetitions(competitions).map((competition) => <Link href={`/league/${competition.slug}`} key={competition.id} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-white/[.07] bg-[#111419] p-4 hover:border-white/15"><LeagueMark slug={competition.slug} name={competition.name} size="medium" showFallbackLabel/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{competition.name}</p><p className="mt-1 text-xs text-[#8d949d]">{competition.region} · {competition.fixtureCount} fixtures{competition.liveCount > 0 ? ` · ${competition.liveCount} live` : ""}</p></div><ArrowUpRight size={17} className="text-[#626a73] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"/></Link>)}</div></section>;
}
