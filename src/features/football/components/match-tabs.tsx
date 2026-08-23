"use client";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Match } from "@/domain/football/types";
import { CalendarClock, CircleDot, LayoutList, Shirt, Trophy } from "lucide-react";
import { LocalKickoff } from "./local-kickoff";

const tabs = ["Overview", "Timeline", "Stats", "Lineups"] as const;
type Tab = typeof tabs[number];

export function MatchTabs({ match }: { match: Match }) {
  const [active, setActive] = useState<Tab>("Overview");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setActive(tabs[next]); refs.current[next]?.focus();
  };
  return <section><div className="hide-scrollbar flex overflow-x-auto border-b border-white/[.08]" role="tablist" aria-label="Match information">{tabs.map((tab, index) => <button key={tab} ref={(element) => { refs.current[index] = element; }} role="tab" aria-selected={active === tab} aria-controls={`panel-${tab.toLowerCase()}`} tabIndex={active === tab ? 0 : -1} onKeyDown={(event) => onKeyDown(event, index)} onClick={() => setActive(tab)} className={`relative min-w-28 px-5 py-4 text-sm font-semibold outline-none transition focus-visible:bg-white/[.06] ${active === tab ? "text-white" : "text-[#737a83] hover:text-white"}`}>{tab}{active === tab && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-[#c7ff4a]"/>}</button>)}</div><div id={`panel-${active.toLowerCase()}`} role="tabpanel" tabIndex={0} className="min-h-64 py-8 outline-none">{active === "Overview" ? <Overview match={match}/> : <Unavailable tab={active}/>}</div></section>;
}

function Overview({ match }: { match: Match }) {
  const details = [{ icon: Trophy, label: "Competition", value: match.competition }, { icon: CalendarClock, label: "Kickoff", value: <LocalKickoff kickoff={match.kickoff}/> }, { icon: CircleDot, label: "Status", value: match.status === "LIVE" ? "Live" : match.status === "FINISHED" ? "Full time" : "Scheduled" }, ...(match.stage ? [{ icon: LayoutList, label: "Round", value: match.stage }] : [])];
  return <div className="grid gap-3 sm:grid-cols-2">{details.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/[.07] bg-white/[.025] p-5"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.05] text-[#8d949d]"><Icon size={18}/></div><div><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#666d75]">{label}</p><div className="mt-1 text-sm font-semibold">{value}</div></div></div>)}</div>;
}

function Unavailable({ tab }: { tab: Exclude<Tab, "Overview"> }) {
  const Icon = tab === "Lineups" ? Shirt : tab === "Timeline" ? LayoutList : CircleDot;
  return <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/10 px-6 text-center"><div><Icon className="mx-auto text-[#59606a]" size={24}/><p className="mt-4 font-semibold">{tab} not available</p><p className="mt-2 max-w-sm text-sm leading-6 text-[#777f88]">Detailed {tab.toLowerCase()} data is not available for this fixture.</p></div></div>;
}
