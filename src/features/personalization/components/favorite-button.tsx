"use client";
import { Star } from "lucide-react";
import { FAVORITES_KEY, parseIds, toggleFavorite } from "../storage";
import { useFavorites } from "../use-favorites";
export function FavoriteButton({ clubSlug }: { clubSlug: string }) { const favorites = useFavorites(); const following = favorites.includes(clubSlug); const toggle = () => { const next = toggleFavorite(parseIds(localStorage.getItem(FAVORITES_KEY)), clubSlug); localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); window.dispatchEvent(new Event("ninety:favorites")); }; return <button onClick={toggle} aria-pressed={following} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#c7ff4a] ${following ? "bg-[#c7ff4a] text-black" : "border border-white/15 bg-white/[.04]"}`}><Star size={17} fill={following ? "currentColor" : "none"}/>{following ? "Following" : "Follow"}</button>; }
