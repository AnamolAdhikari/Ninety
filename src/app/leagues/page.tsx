import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppHeader } from "@/features/shell/app-header";
import { EmptyState, PageIntro } from "@/features/discovery/components/discovery-ui";
import { LeagueMark } from "@/features/football/components/league-mark";
import { getFootballService } from "@/server/services/football.service";

export const metadata: Metadata = { title: "Football Leagues | NINETY", description: "Discover football competitions represented on NINETY." };
export const dynamic = "force-dynamic";

export default async function LeaguesPage() {
  const competitions = await getFootballService().getCompetitions();
  return <><AppHeader/><main className="page-shell py-8 sm:py-10"><PageIntro eyebrow="The world game" title="Leagues" detail="Competitions with available NINETY fixtures"/>{competitions.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{competitions.map((competition) => <Link key={competition.id} href={`/league/${competition.slug}`} className="group flex min-h-32 items-center gap-5 rounded-2xl border border-white/[.07] bg-[#111419] p-5 hover:border-white/15 sm:p-6"><LeagueMark slug={competition.slug} name={competition.name} size="medium" showFallbackLabel/><div className="min-w-0 flex-1"><h2 className="truncate text-lg font-semibold">{competition.name}</h2><p className="mt-1 text-sm text-[#8d949d]">{competition.region}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-white/65 group-hover:text-white">View league <ArrowUpRight size={14}/></span></div></Link>)}</div> : <EmptyState title="No competitions available" copy="Represented leagues will appear when fixtures are available."/>}</main></>;
}
