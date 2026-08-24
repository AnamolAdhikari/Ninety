import type { Metadata } from "next";
import Link from "next/link";

import { CompetitionChips, EmptyState, MatchGrid, PageIntro } from "@/features/discovery/components/discovery-ui";
import { DateNavigator } from "@/features/discovery/components/date-navigator";
import { competitionSlug, getFootballService } from "@/server/services/football.service";

export const metadata: Metadata = { title: "Football Matches & Fixtures | NINETY", description: "Browse football fixtures by date and competition." };
export const dynamic = "force-dynamic";

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  const query = await searchParams;
  const fallback = new Date().toISOString().slice(0, 10);
  const date = typeof query.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : fallback;
  const competition = typeof query.competition === "string" ? query.competition : undefined;
  const { matches, competitions } = await getFootballService().getMatchDiscovery(date, competition);
  const groups = Object.groupBy(matches, (match) => match.competition);
  return <><main className="page-shell py-10"><PageIntro eyebrow="Football calendar" title="Matches" detail="Fixtures grouped by competition and kickoff"/><DateNavigator selected={date} competition={competition}/><CompetitionChips competitions={competitions} active={competition} base={`/matches?date=${date}`}/>{matches.length ? Object.entries(groups).map(([name, items]) => <section key={name} className="mb-10"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{name}</h2><Link href={`/league/${competitionSlug(name)}`} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-[#a1a8b0] hover:border-white/20 hover:text-white">View league</Link></div><MatchGrid matches={items ?? []}/></section>) : <EmptyState title="No matches on this date" copy="Try another day or remove the competition filter."/>}</main></>;
}
