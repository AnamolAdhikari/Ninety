"use client";
import { useEffect, useState } from "react";
import { formatKickoffProximity } from "@/features/football/utils/kickoff-proximity";

export function KickoffProximity({ kickoff }: { kickoff: string }) { const [now, setNow] = useState(() => new Date()); useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []); return <span>{formatKickoffProximity(kickoff, now)}</span>; }
