"use client";

import { useEffect, useState } from "react";
import type { FootballMatchCenterData, Match } from "@/domain/football/types";
import { MatchScoreHeader } from "./match-score-header";

export const LIVE_MATCH_REFRESH_MS = 15_000;

export function LiveMatchScore({ initialMatch }: { initialMatch: Match }) {
  const [match, setMatch] = useState(initialMatch);

  useEffect(() => {
    if (match.status !== "LIVE") return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch(`/api/football/match/${encodeURIComponent(match.id)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as FootballMatchCenterData;
        if (data.match.id === match.id) setMatch(data.match);
      } catch (error) {
        if ((error as Error).name !== "AbortError") return;
      }
    };
    const timer = window.setInterval(() => void refresh(), LIVE_MATCH_REFRESH_MS);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [match.id, match.status]);

  return <MatchScoreHeader match={match}/>;
}
