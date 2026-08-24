import { NextResponse } from "next/server";
import type { FootballService } from "@/server/services/football.service";
import { getFootballService } from "@/server/services/football.service";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const dynamic = "force-dynamic";

export function dashboardCacheControl(data: { live: unknown[]; upcoming: unknown[] }) {
  if (data.live.length) return "public, s-maxage=10, stale-while-revalidate=10";
  if (data.upcoming.length) return "public, s-maxage=60, stale-while-revalidate=120";
  return "public, s-maxage=300, stale-while-revalidate=600";
}

export function createDashboardHandler(service: Pick<FootballService, "getDashboard">) {
  return async function dashboardHandler() {
    try {
      const data = await service.getDashboard();
      return NextResponse.json(data, { headers: { "Cache-Control": dashboardCacheControl(data) } });
    } catch {
      return NextResponse.json({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Football data is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export async function GET(request: Request) { return await enforceRateLimit(request, "metadata") ?? createDashboardHandler(getFootballService())(); }
