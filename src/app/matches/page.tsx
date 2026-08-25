import type { Metadata } from "next";
import { Suspense } from "react";
import { MatchesContent } from "@/features/discovery/components/matches-content";

export const metadata: Metadata = { title: "Football Matches & Fixtures | NINETY", description: "Browse football fixtures by date and competition." };
export default function MatchesPage() { return <Suspense fallback={<main className="page-shell py-10"><div className="skeleton h-12 w-64 rounded"/></main>}><MatchesContent/></Suspense>; }
