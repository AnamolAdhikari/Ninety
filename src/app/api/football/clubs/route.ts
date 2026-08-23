import { NextResponse, type NextRequest } from "next/server";
import { getFootballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const slugs = (request.nextUrl.searchParams.get("slugs") ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20); try { return NextResponse.json({ clubs: await getFootballService().getClubs(slugs.length ? slugs : undefined) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }); } catch { return NextResponse.json({ error: { code: "CLUBS_UNAVAILABLE", message: "Club data is temporarily unavailable." } }, { status: 503 }); } }
