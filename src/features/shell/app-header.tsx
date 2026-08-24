"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowRight, Heart, Search, X } from "lucide-react";
import type { FootballSearchData } from "@/domain/football/types";
import { LeagueMark } from "@/features/football/components/league-mark";
import { TeamCrest } from "@/features/football/components/team-crest";

const links = [["/matches", "Matches"], ["/live", "Live"], ["/leagues", "Leagues"]] as const;
const emptyData: FootballSearchData = { clubs: [], matches: [], competitions: [] };
const suggestions = ["Arsenal", "Real Madrid", "Champions League"];

export function AppHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = () => { setOpen(false); requestAnimationFrame(() => trigger.current?.focus()); };
  return <><header className="sticky top-0 z-50 border-b border-white/[.07] bg-[#080a0d]/92 backdrop-blur-xl"><div className="page-shell flex h-18 items-center gap-7"><Link href="/" aria-label="NINETY home" className="text-xl font-black tracking-[-.08em]">NINETY<span className="text-[var(--lime)]">.</span></Link><nav className="hidden gap-6 text-sm font-semibold md:flex" aria-label="Primary">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname.startsWith(href) ? "page" : undefined} className={pathname.startsWith(href) ? "text-white" : "text-[#8d949d] hover:text-white"}>{label}</Link>)}</nav><div className="ml-auto flex gap-1"><button ref={trigger} type="button" onClick={() => setOpen(true)} aria-label="Search football" aria-haspopup="dialog" className="flex h-11 items-center gap-2 rounded-full px-3 text-[#9ba2aa] hover:bg-white/[.06] hover:text-white"><Search size={19}/><span className="hidden text-xs font-semibold sm:block">Search</span><kbd className="hidden rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-[#6f7780] lg:block">/</kbd></button><Link href="/favorites" aria-label="Favorite clubs" aria-current={pathname === "/favorites" ? "page" : undefined} className={`grid h-11 w-11 place-items-center rounded-full ${pathname === "/favorites" ? "text-[var(--lime)]" : "text-[#9ba2aa] hover:bg-white/[.06] hover:text-white"}`}><Heart size={19}/></Link></div></div><nav className="hide-scrollbar flex justify-around border-t border-white/[.05] px-2 md:hidden" aria-label="Mobile navigation">{[["/", "Home"], ["/live", "Live"], ["/matches", "Matches"], ["/favorites", "Favorites"]].map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className={`min-h-12 min-w-18 py-3 text-center text-xs font-semibold ${pathname === href ? "text-[var(--lime)]" : "text-[#8d949d]"}`}>{label}</Link>)}</nav></header>{open && <SearchDialog close={close}/>}</>;
}

function Highlight({ value, query }: { value: string; query: string }) {
  const index = value.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0 || !query.trim()) return value;
  return <>{value.slice(0, index)}<mark className="bg-transparent text-[var(--lime)]">{value.slice(index, index + query.trim().length)}</mark>{value.slice(index + query.trim().length)}</>;
}

function SearchDialog({ close }: { close: () => void }) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<FootballSearchData>(emptyData);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const listId = useId();
  const term = query.trim();
  const results = useMemo(() => term.length < 2 ? [] : [
    ...data.clubs.map((club) => ({ id: club.id, label: <span className="flex min-w-0 items-center gap-3"><TeamCrest team={club} size="small"/><span className="truncate"><Highlight value={club.name} query={term}/></span></span>, meta: "Club", href: `/club/${club.slug}`, group: "Clubs" })),
    ...data.matches.map((match) => ({ id: match.id, label: <span className="flex min-w-0 items-center gap-3"><span className="flex shrink-0 -space-x-2"><TeamCrest team={match.home} size="small"/><TeamCrest team={match.away} size="small"/></span><span className="truncate"><Highlight value={`${match.home.name} vs ${match.away.name}`} query={term}/></span></span>, meta: match.status, href: `/watch/${match.id}`, group: "Matches" })),
    ...data.competitions.map((competition) => ({ id: competition.id, label: <span className="flex min-w-0 items-center gap-3"><LeagueMark slug={competition.slug} name={competition.name} size="small" showFallbackLabel/><span className="truncate"><Highlight value={competition.name} query={term}/></span></span>, meta: `${competition.fixtureCount} fixtures`, href: `/league/${competition.slug}`, group: "Competitions" })),
  ], [data, term]);

  useEffect(() => {
    input.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && dialog.current) {
        const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button,input,[href]')];
        const first = focusable[0], last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/football/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search unavailable");
        setData(await response.json() as FootballSearchData);
      } catch { if (!controller.signal.aborted) { setData(emptyData); setFailed(true); } }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);

  const go = (href: string) => { close(); router.push(href); };
  const updateQuery = (value: string) => {
    setQuery(value);
    setActive(0);
    setFailed(false);
    if (value.trim().length < 2) { setData(emptyData); setLoading(false); }
  };
  const empty = term.length >= 2 && !loading && !failed && !results.length;
  const keyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((value) => Math.min(value + 1, Math.max(0, results.length - 1))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActive((value) => Math.max(0, value - 1)); }
    if (event.key === "Enter" && results[active]) { event.preventDefault(); go(results[active].href); }
  };

return <div className="fixed inset-0 z-[100] bg-black/80 p-0 backdrop-blur-md sm:p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}><div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${listId}-title`} className="mx-auto flex h-dvh max-w-3xl flex-col overflow-hidden bg-[#0f1216] shadow-2xl sm:mt-[7vh] sm:h-auto sm:max-h-[82vh] sm:rounded-[28px] sm:border sm:border-white/10"><div className="border-b border-white/[.08] px-4 pt-4 sm:px-6"><div className="mb-3 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--lime)]">NINETY intelligence</p><h2 id={`${listId}-title`} className="mt-1 text-lg font-semibold">Find your football</h2></div><button type="button" onClick={close} aria-label="Close search" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/[.06]"><X size={19}/></button></div><div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 px-4 focus-within:border-[var(--lime)]/40"><Search size={20} className="text-[#7f8790]"/><input ref={input} value={query} maxLength={80} onChange={(event) => updateQuery(event.target.value)} onKeyDown={keyDown} role="combobox" aria-expanded={results.length > 0} aria-controls={listId} aria-activedescendant={results[active] ? `${listId}-${active}` : undefined} aria-autocomplete="list" placeholder="Club, competition or matchup" className="h-15 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#69717a]"/>{query && <button type="button" onClick={() => updateQuery("")} className="text-xs font-semibold text-[#858d96] hover:text-white">Clear</button>}</div><div className="flex items-center justify-between py-3 text-[10px] text-[#6f7780]"><span>{results.length ? `${results.length} ranked results` : "Football only"}</span><span className="hidden sm:block">↑↓ Navigate · Enter Open · Esc Close</span></div></div><div id={listId} role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto p-3 sm:p-4" aria-busy={loading} aria-live="polite">{results.map((result, index) => <div key={`${result.group}-${result.id}`}>{index === 0 || results[index - 1].group !== result.group ? <h3 className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#747c85]">{result.group}</h3> : null}<button id={`${listId}-${index}`} role="option" aria-selected={active === index} type="button" onMouseEnter={() => setActive(index)} onClick={() => go(result.href)} className={`flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border px-3 py-3 text-left transition ${active === index ? "border-white/10 bg-white/[.07]" : "border-transparent hover:bg-white/[.04]"}`}><span className="min-w-0 truncate font-semibold">{result.label}</span><span className="flex shrink-0 items-center gap-2 text-xs text-[#858d96]">{result.meta}<ArrowRight size={14}/></span></button></div>)}{loading && <div role="status" className="space-y-3 py-5">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[.04]"/>)}</div>}{failed && <p role="status" className="py-12 text-center text-sm text-[#b0b6bd]">Search is temporarily unavailable. Try again shortly.</p>}{empty && <p role="status" className="py-12 text-center text-sm text-[#8d949d]">No clubs, matches or competitions match “{term}”.</p>}{term.length < 2 && <div className="py-8"><p className="text-center text-sm text-[#8d949d]">Search across clubs, competitions and available fixtures.</p><div className="mt-5 flex flex-wrap justify-center gap-2">{suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => updateQuery(suggestion)} className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-[#9ba2aa] hover:border-white/20 hover:text-white">{suggestion}</button>)}</div></div>}</div></div></div>;
}
