import { NextResponse } from "next/server";
import type { FootballService } from "@/server/services/football.service";
import { getFootballService } from "@/server/services/football.service";
import { isSafeOpaqueId } from "@/server/http/input";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const dynamic = "force-dynamic";

export function createMatchHandler(service: Pick<FootballService, "getMatchCenter">) {
  return async function matchHandler(matchId: string) {
    if (!isSafeOpaqueId(matchId)) return NextResponse.json({ error: { code: "INVALID_MATCH_ID", message: "Match identifier is invalid." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
    try {
      const data = await service.getMatchCenter(matchId);
      if (!data) return NextResponse.json({ error: { code: "MATCH_NOT_FOUND", message: "Match unavailable." } }, { status: 404, headers: { "Cache-Control": "no-store" } });
      return NextResponse.json(data, { headers: { "Cache-Control": data.match.status === "LIVE" ? "public, s-maxage=10, stale-while-revalidate=20" : "public, s-maxage=60, stale-while-revalidate=120" } });
    } catch {
      return NextResponse.json({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Match data is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
  };
}

export async function GET(request: Request, { params }: RouteContext<"/api/football/match/[matchId]">) {
  const limited = await enforceRateLimit(request, "metadata");
  if (limited) return limited;
  const { matchId } = await params;
  return createMatchHandler(getFootballService())(matchId);
}
