import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Radio } from "lucide-react";

import { CompetitionNavigation } from "@/features/discovery/components/competition-navigation";
import { EmptyState, MatchGrid } from "@/features/discovery/components/discovery-ui";
import { LeagueMark } from "@/features/football/components/league-mark";
import { TeamCrest } from "@/features/football/components/team-crest";
import { getLeaguePageData } from "@/features/football/server/league-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/league/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getLeaguePageData(slug);
  const title = data ? `${data.competition.name} Matches | NINETY` : "League unavailable | NINETY";
  const description = data ? `${data.competition.fixtureCount} available ${data.competition.name} fixtures, clubs and live matches on NINETY.` : "This competition could not be found.";
  return { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } };
}

export default async function LeaguePage({ params }: PageProps<"/league/[slug]">) {
  const { slug } = await params;
  const data = await getLeaguePageData(slug);
  if (!data) notFound();
  const sections = [["Results", data.results], ["Live", data.live], ["Today", data.today], ["Upcoming", data.upcoming]] as const;
  return <><main className="page-shell py-8 sm:py-10"><header className="mb-10 overflow-hidden rounded-[30px] border border-white/[.07] bg-[radial-gradient(circle_at_top_right,rgba(199,255,74,.11),transparent_38%)] p-6 sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-center"><LeagueMark slug={data.competition.slug} name={data.competition.name} size="large" showFallbackLabel/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--lime)]">{data.competition.region}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-5xl">{data.competition.name}</h1><p className="mt-3 text-sm text-[#8d949d]">Live context, upcoming fixtures and participating clubs</p></div></div><div className="mt-8 grid grid-cols-2 gap-3 border-t border-white/[.07] pt-6 sm:grid-cols-4">{[["Fixtures", data.competition.fixtureCount], ["Live", data.competition.liveCount], ["Upcoming", data.competition.upcomingCount], ["Clubs", data.competition.clubCount]].map(([label, value]) => <div key={label} className="rounded-2xl bg-black/20 p-4"><p className={`font-mono text-2xl font-semibold ${label === "Live" && Number(value) > 0 ? "text-[#ff5b68]" : ""}`}>{value}</p><p className="mt-1 text-xs text-[#7f8790]">{label}</p></div>)}</div></header><CompetitionNavigation competitions={data.competitions}/>{data.clubs.length > 0 && <section className="mb-10"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--lime)]">Competition map</p><h2 className="mt-1 text-xl font-semibold">Participating clubs</h2></div><span className="text-xs text-[#7f8790]">{data.clubs.length} represented</span></div><div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">{data.clubs.map((club) => <Link key={club.id} href={`/club/${club.slug}`} className="flex min-w-48 snap-start items-center gap-3 rounded-2xl border border-white/[.07] bg-[#111419] p-3 hover:border-white/15"><TeamCrest team={club} size="small"/><span className="truncate text-sm font-semibold">{club.name}</span></Link>)}</div></section>}{sections.map(([title, matches]) => matches.length > 0 && <section key={title} className="mb-10"><div className="mb-4 flex items-center gap-2"><h2 className={`text-xl font-semibold ${title === "Live" ? "text-[#ff5b68]" : ""}`}>{title}</h2>{title === "Live" && <Radio size={16} className="text-[#ff5b68]"/>}<span className="rounded-full bg-white/[.05] px-2 py-1 text-[10px] text-[#858d96]">{matches.length}</span></div><MatchGrid matches={[...matches]}/></section>)}{!sections.some(([, matches]) => matches.length) && <EmptyState title="No competition matches" copy="There are no available fixtures for this competition right now."/>}</main></>;
}
