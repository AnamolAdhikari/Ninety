import { NextResponse } from "next/server";
import { footballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json(await footballService.getDashboard(), { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30" } }); } catch { return NextResponse.json({ error: "Football data is temporarily unavailable." }, { status: 503 }); } }
