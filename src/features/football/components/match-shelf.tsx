"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Match } from "@/domain/football/types";
import { MatchCard } from "./match-card";

export function MatchShelf({ eyebrow, title, matches, href, showCompetition = true }: { eyebrow?: string; title: string; matches: Match[]; href: string; showCompetition?: boolean }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ overflow: false, start: true, end: true });
  const measure = useCallback(() => {
    const node = scroller.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    setPosition({ overflow: max > 2, start: node.scrollLeft <= 2, end: node.scrollLeft >= max - 2 });
  }, []);
  useEffect(() => {
    const node = scroller.current;
    if (!node) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const child of node.children) observer.observe(child);
    node.addEventListener("scroll", measure, { passive: true });
    return () => { observer.disconnect(); node.removeEventListener("scroll", measure); };
  }, [matches, measure]);
  const move = (direction: -1 | 1) => scroller.current?.scrollBy({ left: direction * scroller.current.clientWidth, behavior: "smooth" });

  return <section className="min-w-0 border-b border-white/[.07] py-7" data-match-shelf>
    <div className="mb-4 flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">{eyebrow && <p className="text-[11px] font-black uppercase tracking-[.18em] text-[var(--lime)]">{eyebrow}</p>}<h2 className="mt-1 truncate text-xl font-semibold tracking-[-.035em] sm:text-2xl">{title}</h2></div>
      <div className="flex shrink-0 items-center gap-2">
        {position.overflow && <div className="hidden items-center gap-1 md:flex" aria-label={`${title} shelf navigation`}>
          <button type="button" onClick={() => move(-1)} disabled={position.start} aria-label={`Scroll ${title} matches left`} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white transition hover:border-white/25 disabled:pointer-events-none disabled:opacity-25"><ChevronLeft size={17}/></button>
          <button type="button" onClick={() => move(1)} disabled={position.end} aria-label={`Scroll ${title} matches right`} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white transition hover:border-white/25 disabled:pointer-events-none disabled:opacity-25"><ChevronRight size={17}/></button>
        </div>}
        <Link href={href} className="inline-flex min-h-9 items-center px-1 text-sm font-bold text-[var(--lime)]">View all</Link>
      </div>
    </div>
    <div ref={scroller} className="hide-scrollbar flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain scroll-smooth pb-2 pr-4 [scroll-padding-inline:0_1rem] [touch-action:pan-x]" data-shelf-scroller>
      {matches.map((match) => <div key={match.id} className="w-[84%] max-w-[330px] shrink-0 snap-start sm:w-[320px] md:w-auto md:max-w-none md:basis-[calc((100%_+_1rem_-_1.5rem)_/_3)] xl:basis-[calc((100%_+_1rem_-_2.25rem)_/_4)]" data-shelf-card><MatchCard match={match} showCompetition={showCompetition}/></div>)}
    </div>
  </section>;
}
