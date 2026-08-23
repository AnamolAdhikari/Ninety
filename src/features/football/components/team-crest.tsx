"use client";
import Image from "next/image";
import { useState } from "react";
import type { Team } from "@/domain/football/types";

export function TeamCrest({ team, size = "medium" }: { team: Team; size?: "small" | "medium" | "large" }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const sizes = { small: "h-10 w-10 text-[11px]", medium: "h-16 w-16 text-sm", large: "h-22 w-22 text-lg sm:h-28 sm:w-28 sm:text-xl" };
  const fallback = !team.crestUrl || failedUrl === team.crestUrl;
  return <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[30%] border border-white/15 font-black text-white shadow-xl ${sizes[size]}`} style={fallback ? { background: `linear-gradient(145deg, ${team.colors[0]}, ${team.colors[1]})` } : undefined} aria-label={`${team.name} crest`}>{!fallback && <Image src={team.crestUrl!} alt="" width={112} height={112} loading="lazy" unoptimized loader={({ src }) => src} onError={() => setFailedUrl(team.crestUrl)} className="h-full w-full object-contain"/>}{fallback && <span className="rounded bg-black/25 px-1.5 py-1 backdrop-blur">{team.shortName}</span>}</div>;
}
