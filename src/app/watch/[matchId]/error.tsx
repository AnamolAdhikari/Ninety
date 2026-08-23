"use client";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

export default function MatchError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="noise grid min-h-screen place-items-center px-6 text-center"><div><h1 className="text-3xl font-semibold tracking-[-.04em]">Match temporarily unavailable</h1><p className="mt-3 text-sm text-[#858c95]">We couldn&apos;t load this fixture right now.</p><div className="mt-7 flex justify-center gap-3"><button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-[#c7ff4a] px-5 py-3 text-sm font-bold text-black"><RotateCcw size={16}/> Try again</button><Link href="/" className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold">Back to matches</Link></div></div></main>;
}
