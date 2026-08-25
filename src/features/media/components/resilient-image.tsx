"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
export { deterministicInitials } from "@/domain/football/visual-identity";

const failedSources = new Set<string>();
export const selectResilientSource = (sources: Array<string | undefined>, failed: ReadonlySet<string>) => sources.find((candidate): candidate is string => Boolean(candidate) && !failed.has(candidate!) && !failedSources.has(candidate!));

export function ResilientImage({ sources, alt = "", className, fallback }: { sources: Array<string | undefined>; alt?: string; className?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const source = selectResilientSource(sources, failed);
  const image = useRef<HTMLImageElement>(null);
  const markFailed = (value: string) => { failedSources.add(value); setFailed((current) => new Set(current).add(value)); };
  useEffect(() => { if (!source) return; const timer = window.setTimeout(() => { const element = image.current; if (element?.complete && element.naturalWidth === 0) markFailed(source); }, 0); return () => window.clearTimeout(timer); }, [source]);
  if (!source) return fallback;
  // A plain image keeps arbitrary validated provider crests reliable on Cloudflare without the Next optimizer proxy.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} src={source} alt={alt} className={className} loading="lazy" decoding="async" onError={() => markFailed(source)}/>
}
