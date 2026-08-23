import { NextResponse, type NextRequest } from "next/server";
import { getFootballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";
const validDate = /^\d{4}-\d{2}-\d{2}$/;
export async function GET(request: NextRequest) { const date = request.nextUrl.searchParams.get("date"); const competition = request.nextUrl.searchParams.get("competition") ?? undefined; if (!date || !validDate.test(date)) return NextResponse.json({ error: { code: "INVALID_DATE", message: "A valid date is required." } }, { status: 400 }); try { return NextResponse.json({ date, matches: await getFootballService().getMatchesByDate(date, competition) }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }); } catch { return NextResponse.json({ error: { code: "FOOTBALL_DATA_UNAVAILABLE", message: "Football data is temporarily unavailable." } }, { status: 503 }); } }
