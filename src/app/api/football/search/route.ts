import { NextResponse, type NextRequest } from "next/server";
import { getFootballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 80); try { return NextResponse.json(await getFootballService().search(query), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }); } catch { return NextResponse.json({ error: { code: "SEARCH_UNAVAILABLE", message: "Search is temporarily unavailable." } }, { status: 503 }); } }
