import type { Metadata } from "next";
import { AppHeader } from "@/features/shell/app-header";
import { CompetitionChips, EmptyState, MatchGrid, PageIntro } from "@/features/discovery/components/discovery-ui";
import { getFootballService } from "@/server/services/football.service";

export const metadata: Metadata = { title: "Live Football | NINETY", description: "Follow football matches currently live on NINETY." };
export const dynamic = "force-dynamic";

export default async function LivePage({ searchParams }: PageProps<"/live">) {
  const { competition } = await searchParams;
  const active = typeof competition === "string" ? competition : undefined;
  const { matches, competitions } = await getFootballService().getLiveDiscovery(active);
  return <><AppHeader/><main className="page-shell py-10"><PageIntro eyebrow="On the pitch" title="Live football" detail={`${matches.length} ${matches.length === 1 ? "match" : "matches"} live`}/><CompetitionChips competitions={competitions} active={active} base="/live"/>{matches.length ? <MatchGrid matches={matches}/> : <EmptyState title="No live football right now" copy="The next live fixture will appear here as soon as play begins."/>}</main></>;
}
