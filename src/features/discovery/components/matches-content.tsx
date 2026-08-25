"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { MatchScheduleData } from "@/domain/football/types";
import { getMatchSchedule } from "@/features/football/api/football-client";
import { CompetitionChips, EmptyState, MatchGrid, PageIntro } from "./discovery-ui";
import { DateNavigator } from "./date-navigator";
import { usePublishLiveStatus } from "@/features/football/hooks/use-live-status";

const validDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);

export function MatchesContent() {
  const query = useSearchParams();
  const date = validDate(query.get("date"));
  const competition = query.get("competition") ?? undefined;
  const [data, setData] = useState<MatchScheduleData>();
  const [failed, setFailed] = useState(false);
  usePublishLiveStatus(data ? data.matches.some((match) => match.status === "LIVE") : undefined);
  useEffect(() => { const controller = new AbortController(); getMatchSchedule(date, competition, controller.signal).then((result) => { setData(result); setFailed(false); }).catch((error: Error) => { if (error.name !== "AbortError") setFailed(true); }); return () => controller.abort(); }, [date, competition]);
  return <main className="page-shell py-7 sm:py-10"><PageIntro eyebrow="Football calendar" title="Matches" detail="Every available fixture, grouped once by competition"/><DateNavigator selected={date} competition={competition}/>{data && <CompetitionChips competitions={data.competitions} active={competition} base={`/matches?date=${date}`}/>} {failed ? <EmptyState title="Schedule temporarily unavailable" copy="Try again in a moment."/> : !data ? <ScheduleLoading/> : data.groups.length ? data.groups.map((group) => <section key={group.slug} className="mb-9"><div className="mb-4 flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">{group.name}</h2>{group.slug !== "football" && <Link href={`/league/${group.slug}`} className="shrink-0 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-[#a1a8b0] hover:border-white/20 hover:text-white">View league</Link>}</div><MatchGrid matches={group.matches} showCompetition={group.slug !== "football"}/></section>) : <EmptyState title="No matches on this date" copy="Try another day or remove the competition filter."/>}</main>;
}

function ScheduleLoading() { return <div aria-label="Loading match schedule" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[1,2,3,4,5,6].map((item) => <div key={item} className="skeleton h-52 rounded-2xl"/>)}</div>; }
