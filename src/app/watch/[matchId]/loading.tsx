import { PlayerLoading } from "@/features/football/components/player-shell";

export default function MatchLoading() {
  return <div className="min-h-screen px-4 pb-16 pt-24 sm:px-8"><main className="mx-auto max-w-[1320px]"><div className="mb-6 h-5 w-32 animate-pulse rounded bg-white/[.05]"/><PlayerLoading/><div className="mx-auto flex max-w-3xl items-center justify-between py-12"><div className="h-22 w-22 animate-pulse rounded-[30%] bg-white/[.05]"/><div className="h-12 w-28 animate-pulse rounded bg-white/[.05]"/><div className="h-22 w-22 animate-pulse rounded-[30%] bg-white/[.05]"/></div><div className="mx-auto max-w-4xl"><div className="flex gap-4 border-b border-white/[.07] pb-4">{[1,2,3,4].map((item) => <div key={item} className="h-4 w-20 animate-pulse rounded bg-white/[.05]"/>)}</div><div className="mt-8 h-44 animate-pulse rounded-2xl bg-white/[.04]"/></div></main></div>;
}
