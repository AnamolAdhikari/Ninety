import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/features/shell/app-header";
import { EmptyState, MatchGrid } from "@/features/discovery/components/discovery-ui";
import { LeagueMark } from "@/features/football/components/league-mark";
import { getFootballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/league/[slug]">): Promise<Metadata> { const { slug } = await params; const data = await getFootballService().getLeague(slug); const title = data ? `${data.competition.name} Matches | NINETY` : "League unavailable | NINETY"; const description = data ? `Live and upcoming ${data.competition.name} football matches on NINETY.` : "This competition could not be found."; return { title, description, openGraph: { title, description, images: [] }, twitter: { title, description, images: [] } }; }

export default async function LeaguePage({ params }: PageProps<"/league/[slug]">) {
  const { slug } = await params; const data = await getFootballService().getLeague(slug); if (!data) notFound(); const sections = [["Live", data.live], ["Today", data.today], ["Upcoming", data.upcoming]] as const;
  return <><AppHeader/><main className="page-shell py-8 sm:py-10"><header className="mb-10 flex flex-col gap-6 rounded-3xl border border-white/[.07] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,.07),transparent_48%)] p-6 sm:flex-row sm:items-center sm:p-8"><LeagueMark slug={data.competition.slug} name={data.competition.name} size="large" showFallbackLabel/><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#c7ff4a]">{data.competition.region}</p><h1 className="mt-2 text-3xl font-semibold tracking-[-.05em] sm:text-5xl">{data.competition.name}</h1><p className="mt-3 text-sm text-[#8d949d]">Live, today and upcoming fixtures</p></div></header>{sections.map(([title, matches]) => matches.length > 0 && <section key={title} className="mb-10"><h2 className={`mb-4 text-xl font-semibold ${title === "Live" ? "text-[#ff4d5e]" : ""}`}>{title}</h2><MatchGrid matches={[...matches]}/></section>)}{!sections.some(([, matches]) => matches.length) && <EmptyState title="No competition matches" copy="There are no available fixtures for this competition right now."/>}</main></>;
}
