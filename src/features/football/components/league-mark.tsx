"use client";
import Image from "next/image";
import { useState } from "react";
import { Trophy } from "lucide-react";
import { getLeagueBranding } from "@/features/football/branding/leagues";

export function LeagueMark({ slug, name, size = "medium", showFallbackLabel = false }: { slug: string; name: string; size?: "small" | "medium" | "large"; showFallbackLabel?: boolean }) {
  const branding = getLeagueBranding(slug); const [failedLogo, setFailedLogo] = useState<string>(); const failed = !branding || failedLogo === branding.logo;
  const sizes = { small: "h-7 w-7 rounded-lg", medium: "h-14 w-14 rounded-2xl", large: "h-24 w-24 rounded-3xl sm:h-28 sm:w-28" };
  const imageSizes = { small: 20, medium: 42, large: 82 };
  return <span className={`grid shrink-0 place-items-center overflow-hidden border border-white/10 p-1.5 ${sizes[size]}`} style={{ background: branding?.surface ?? "rgba(255,255,255,.05)", color: branding?.accent ?? "#c7ff4a" }} aria-label={`${name} logo`}>{!failed ? <Image src={branding.logo} alt="" width={imageSizes[size]} height={imageSizes[size]} className="h-auto w-auto max-h-full max-w-full object-contain" onError={() => setFailedLogo(branding.logo)}/> : showFallbackLabel ? <span className="text-[10px] font-black uppercase tracking-[-.04em]">{name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3)}</span> : <Trophy aria-hidden="true" size={size === "small" ? 14 : size === "large" ? 30 : 21}/>}</span>;
}
