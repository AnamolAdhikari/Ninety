"use client";
import { useEffect } from "react";
import { addRecent, parseRecent, RECENT_KEY } from "../storage";
export function RecentTracker({ matchId }: { matchId: string }) { useEffect(() => { localStorage.setItem(RECENT_KEY, JSON.stringify(addRecent(parseRecent(localStorage.getItem(RECENT_KEY)), matchId))); }, [matchId]); return null; }
