import { NextResponse, type NextRequest } from "next/server";
import type { FootballService } from "@/server/services/football.service";
import { getFootballService } from "@/server/services/football.service";
import { isSafeSlug, isValidIsoDate } from "@/server/http/input";
import { enforceRateLimit } from "@/server/http/rate-limit";

export const dynamic = "force-dynamic";
export const scheduleCacheControl = (matches: Array<{ status: string }>) => matches.some((match) => match.status === "LIVE") ? "public, s-maxage=15, stale-while-revalidate=15" : matches.some((match) => match.status === "UPCOMING") ? "public, s-maxage=60, stale-while-revalidate=120" : "public, s-maxage=300, stale-while-revalidate=600";

export function createMatchesHandler(service: Pick<FootballService, "getMatchSchedule">) {
  return async (date: string, competition?: string) => { try { const data = await service.getMatchSchedule(date, competition); return NextResponse.json(data, { headers: { "Cache-Control": scheduleCacheControl(data.matches) } }); } catch { return NextResponse.json({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Football data is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } }); } };
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(request, "metadata"); if (limited) return limited;
  const date = request.nextUrl.searchParams.get("date");
  const competition = request.nextUrl.searchParams.get("competition") ?? undefined;
  if (!date || !isValidIsoDate(date)) return NextResponse.json({ error: { code: "INVALID_DATE", message: "A valid calendar date is required." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (competition && !isSafeSlug(competition)) return NextResponse.json({ error: { code: "INVALID_COMPETITION", message: "Competition filter is invalid." } }, { status: 400, headers: { "Cache-Control": "no-store" } });
  return createMatchesHandler(getFootballService())(date, competition);
}
