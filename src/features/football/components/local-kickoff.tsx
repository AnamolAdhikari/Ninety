"use client";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function LocalKickoff({ kickoff, includeDay = true }: { kickoff: string; includeDay?: boolean }) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  if (!hydrated) return <time dateTime={kickoff}>Kickoff time</time>;
  const date = new Date(kickoff);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const day = sameDay(date, now) ? "Today" : sameDay(date, tomorrow) ? "Tomorrow" : date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const label = includeDay ? `${day} • ${time}` : time;
  return <time dateTime={kickoff}>{label}</time>;
}
