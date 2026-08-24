import { NextResponse } from "next/server";
import type { FootballService } from "@/server/services/football.service";
import { getFootballService } from "@/server/services/football.service";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const dynamic = "force-dynamic";

export function createDashboardHandler(service: Pick<FootballService, "getDashboard">) {
  return async function dashboardHandler() {
    try {
      return NextResponse.json(await service.getDashboard(), { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } });
    } catch {
      return NextResponse.json({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Football data is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export async function GET(request: Request) { return await enforceRateLimit(request, "metadata") ?? createDashboardHandler(getFootballService())(); }
