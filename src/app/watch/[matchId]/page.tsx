import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LiveMatchScore } from "@/features/football/components/live-match-score";
import { SecurePlayerLauncher } from "@/features/stream/components/secure-player-launcher";
import { getMatchCenterData } from "@/features/football/server/match-center-data";
import { RecentTracker } from "@/features/personalization/components/recent-tracker";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/watch/[matchId]">): Promise<Metadata> {
  const { matchId } = await params;
  const data = await getMatchCenterData(matchId);
  if (!data) return { title: "Match unavailable — NINETY", description: "This football fixture could not be found.", openGraph: { title: "Match unavailable — NINETY", description: "This football fixture could not be found.", images: [] }, twitter: { title: "Match unavailable — NINETY", description: "This football fixture could not be found.", images: [] } };
  const title = `${data.match.home.name} vs ${data.match.away.name} — NINETY`;
  const description = `${data.match.competition}: ${data.match.home.name} vs ${data.match.away.name}. Match information and live status on NINETY.`;
  const images = data.match.posterUrl ? [data.match.posterUrl] : [];
  return { title, description, openGraph: { title, description, images }, twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images } };
}

export default async function MatchPage({ params }: PageProps<"/watch/[matchId]">) {
  const { matchId } = await params;
  const data = await getMatchCenterData(matchId);
  if (!data) notFound();
  return <div className="noise min-h-screen"><RecentTracker matchId={data.match.id}/><main className="mx-auto max-w-[1180px] px-3 pb-12 pt-3 sm:px-8 sm:pt-6"><Link href="/" className="mb-2 inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-[#8d949d] outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#c7ff4a]"><ArrowLeft size={17}/> Live football</Link><div className="mb-3 overflow-hidden rounded-2xl border border-white/[.07] bg-[#0f1216]"><LiveMatchScore initialMatch={data.match}/></div><SecurePlayerLauncher match={data.match} isolatedPlayerOrigin={process.env.NINETY_PLAYER_ORIGIN}/><div className="mx-auto mt-5 max-w-3xl rounded-2xl border border-white/[.07] bg-white/[.025] p-4 text-sm text-white/55"><span className="font-semibold text-white">{data.match.competition}</span> · {data.match.stage}</div></main></div>;
}
