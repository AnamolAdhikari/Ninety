import { NextResponse, type NextRequest } from "next/server";
import { getFootballService } from "@/server/services/football.service";
import { isSafeSlug } from "@/server/http/input";
import { enforceRateLimit } from "@/server/http/rate-limit";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { const limited = await enforceRateLimit(request, "metadata"); if (limited) return limited; const raw = (request.nextUrl.searchParams.get("slugs") ?? "").split(",").map((item) => item.trim()).filter(Boolean); if (raw.length > 20 || raw.some((slug) => !isSafeSlug(slug))) return NextResponse.json({ error: { code: "INVALID_CLUBS", message: "Club filters are invalid." } }, { status: 400, headers: { "Cache-Control": "no-store" } }); const slugs = [...new Set(raw)]; try { return NextResponse.json({ clubs: await getFootballService().getClubs(slugs.length ? slugs : undefined) }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" } }); } catch { return NextResponse.json({ error: { code: "CLUBS_UNAVAILABLE", message: "Club data is temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } }); } }
