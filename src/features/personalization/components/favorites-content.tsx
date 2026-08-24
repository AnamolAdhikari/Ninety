"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { ClubData } from "@/domain/football/types";
import { ClubCard, PageIntro } from "@/features/discovery/components/discovery-ui";
import { useFavorites } from "../use-favorites";

export function FavoritesContent() {
  const [clubs, setClubs] = useState<ClubData[] | null>(null);
  const slugs = useFavorites();
  const key = slugs.join(",");
  useEffect(() => {
    const promise: Promise<{ clubs?: ClubData[] }> = slugs.length
      ? fetch(`/api/football/clubs?slugs=${encodeURIComponent(key)}`).then((response) => response.json() as Promise<{ clubs?: ClubData[] }>)
      : Promise.resolve({ clubs: [] });
    promise.then((data) => setClubs(data.clubs ?? [])).catch(() => setClubs([]));
  }, [key, slugs.length]);
  return <main className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8"><PageIntro eyebrow="Personal dashboard" title="My clubs" detail="Your favorite clubs and their next available fixtures"/>{clubs === null ? <div className="grid gap-4 sm:grid-cols-2">{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-2xl bg-white/[.04]"/>)}</div> : clubs.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{clubs.map((club) => <ClubCard key={club.team.id} club={club}/>)}</div> : <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/10 text-center"><div><Heart className="mx-auto text-[#626a73]"/><h2 className="mt-5 text-2xl font-semibold">Your football, your way.</h2><p className="mt-2 text-sm text-[#7d848d]">Follow clubs to keep their matches close.</p><Link href="/leagues" className="mt-6 inline-block rounded-full bg-[#c7ff4a] px-5 py-3 text-sm font-bold text-black">Explore clubs</Link></div></div>}</main>;
}
