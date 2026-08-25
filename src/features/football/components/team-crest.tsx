"use client";
import type { Team } from "@/domain/football/types";
import { resolveTeamVisualIdentity } from "@/domain/football/visual-identity";
import { ResilientImage } from "@/features/media/components/resilient-image";

export function TeamCrest({ team, size = "medium" }: { team: Team; size?: "small" | "medium" | "large" }) {
  const identity = resolveTeamVisualIdentity(team);
  const sizes = { small: "h-10 w-10 text-[11px]", medium: "h-16 w-16 text-sm", large: "h-22 w-22 text-lg sm:h-28 sm:w-28 sm:text-xl" };
  const fallback = <span className="absolute inset-0 grid place-items-center bg-[url('/badges/team-generic.svg')] bg-cover" style={{ backgroundColor: team.colors[0] }}><span className="rounded bg-black/55 px-1.5 py-1 font-black text-white backdrop-blur-sm">{identity.fallbackInitials}</span></span>;
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] border border-white/15 text-white shadow-xl ${sizes[size]}`} aria-label={`${identity.displayName} crest`} data-team-key={identity.key}><ResilientImage sources={identity.sources} alt="" className="h-full w-full object-contain" fallback={fallback}/></span>;
}
