"use client";
import { resolveCompetitionVisualIdentity } from "@/domain/football/competition-identity";
import { ResilientImage } from "@/features/media/components/resilient-image";

export function LeagueMark({ slug, name, size = "medium" }: { slug: string; name: string; size?: "small" | "medium" | "large"; showFallbackLabel?: boolean }) {
  const identity = resolveCompetitionVisualIdentity({ slug, name });
  const sizes = { small: "h-7 w-7 rounded-lg text-[8px]", medium: "h-14 w-14 rounded-2xl text-[10px]", large: "h-24 w-24 rounded-3xl text-sm sm:h-28 sm:w-28" };
  const fallback = <span className="absolute inset-0 grid place-items-center bg-[url('/badges/competition-generic.svg')] bg-cover"><span className="font-black uppercase tracking-[-.04em]">{identity.fallbackInitials}</span></span>;
  return <span className={`relative grid shrink-0 place-items-center overflow-hidden border border-white/10 p-1.5 font-black ${sizes[size]}`} style={{ background: identity.surface, color: identity.accent }} aria-label={`${identity.name} logo`} data-competition-key={identity.slug}><ResilientImage sources={[identity.localLogo, identity.remoteLogo]} alt="" className="h-full w-full object-contain p-1" fallback={fallback}/></span>;
}
