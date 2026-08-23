"use client";
import type { Match } from "@/domain/football/types";
import { MatchCard } from "@/features/football/components/match-card";
import { useFavorites } from "../use-favorites";
export function FavoriteMatches({ matches }: { matches: Match[] }) { const favorites=useFavorites(); const relevant=matches.filter((match)=>favorites.includes(match.home.slug)||favorites.includes(match.away.slug)).slice(0,6); if(!relevant.length)return null; return <section className="border-t border-white/[.07] py-10"><p className="mb-1 text-xs font-semibold uppercase tracking-[.16em] text-[#c7ff4a]">Personalized</p><h2 className="mb-5 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">Your clubs</h2><div className="hide-scrollbar flex gap-4 overflow-x-auto pb-2">{relevant.map((match)=><MatchCard key={match.id} match={match}/>)}</div></section>; }
