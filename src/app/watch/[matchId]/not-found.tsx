import Link from "next/link";
import { ArrowLeft, CircleOff } from "lucide-react";

export default function MatchNotFound() {
  return <main className="noise grid min-h-screen place-items-center px-6 text-center"><div><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-white/10 bg-white/[.04] text-[#737a83]"><CircleOff size={26}/></div><h1 className="mt-6 text-3xl font-semibold tracking-[-.04em]">Match unavailable</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#858c95]">This fixture could not be found or is no longer available.</p><Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black outline-none focus-visible:ring-2 focus-visible:ring-[#c7ff4a]"><ArrowLeft size={17}/> Back to matches</Link></div></main>;
}
