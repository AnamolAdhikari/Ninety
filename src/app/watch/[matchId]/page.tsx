import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { MatchCard } from "@/features/football/components/match-card";
import { MatchScoreHeader } from "@/features/football/components/match-score-header";
import { MatchTabs } from "@/features/football/components/match-tabs";
import { StreamPlayer } from "@/features/stream/components/stream-player";
import { getMatchCenterData } from "@/features/football/server/match-center-data";

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
  return <div className="noise min-h-screen"><header className="border-b border-white/[.07] bg-[#080a0d]/95"><div className="mx-auto flex h-18 max-w-[1500px] items-center px-5 sm:px-8"><Link href="/" className="text-xl font-black tracking-[-.08em]">NINETY<span className="text-[#c7ff4a]">.</span></Link><span className="mx-4 h-4 w-px bg-white/10"/><span className="text-xs font-semibold uppercase tracking-[.16em] text-[#737a83]">Match center</span></div></header><main className="mx-auto max-w-[1320px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8"><Link href="/" className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-2 text-sm font-medium text-[#8d949d] outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-[#c7ff4a]"><ArrowLeft size={17}/> Back to matches</Link><StreamPlayer matchId={data.match.id}/><MatchScoreHeader match={data.match}/><div className="mx-auto max-w-4xl"><MatchTabs match={data.match}/></div>{data.related.length > 0 && <section className="mt-12 border-t border-white/[.08] pt-10"><div className="mb-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[#c7ff4a]">Keep watching</p><h2 className="mt-2 text-2xl font-semibold tracking-[-.04em]">Other matches</h2></div><div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{data.related.map((match) => <MatchCard key={match.id} match={match}/>)}</div></section>}</main></div>;
}
