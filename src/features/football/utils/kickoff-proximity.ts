const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const clock = (date: Date) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);

export function formatKickoffProximity(kickoff: string, now = new Date()) {
  const date = new Date(kickoff);
  const minutes = Math.max(0, Math.ceil((date.valueOf() - now.valueOf()) / 60_000));
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (minutes < 6 * 60) return `Starts in ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  if (sameDay(date, now)) return `Today · ${clock(date)}`;
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (sameDay(date, tomorrow)) return `Tomorrow · ${clock(date)}`;
  if (date.valueOf() - now.valueOf() < 7 * 24 * 60 * 60 * 1000) return `${new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date)} · ${clock(date)}`;
  return `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date)} · ${clock(date)}`;
}
