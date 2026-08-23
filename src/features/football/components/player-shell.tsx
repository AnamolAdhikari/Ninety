import { Expand, Play } from "lucide-react";

export function PlayerShell() {
  return <section className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[.08] bg-black shadow-[0_35px_100px_rgba(0,0,0,.55)] sm:rounded-[26px]" aria-label="Match player placeholder"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(70,83,99,.24),transparent_38%),linear-gradient(150deg,#090b0e,#020203)]"/><div className="absolute inset-0 opacity-25 noise"/><div className="absolute inset-0 grid place-items-center text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-white/15 bg-white/[.08] text-white backdrop-blur-sm transition group-hover:scale-105 sm:h-20 sm:w-20"><Play className="ml-1" size={28} fill="currentColor"/></div><p className="mt-5 text-sm font-semibold text-white/85">Stream available soon</p><p className="mt-1 text-xs text-white/35">The viewing experience is being prepared</p></div></div><div className="absolute inset-x-4 bottom-4 flex items-center gap-3 text-white/35 sm:inset-x-6 sm:bottom-5"><span className="h-1 flex-1 rounded-full bg-white/10"/><Expand size={18} aria-label="Fullscreen preview"/></div></section>;
}

export function PlayerLoading() {
  return <div className="aspect-video w-full animate-pulse rounded-2xl border border-white/[.06] bg-white/[.04] sm:rounded-[26px]" aria-hidden="true"/>;
}
