import { NextResponse } from "next/server";
import type { StreamService } from "@/server/services/stream.service";
import { getStreamService } from "@/server/services/stream.service";
export const dynamic = "force-dynamic";
export function createStreamListHandler(service: Pick<StreamService, "list">) { return async (matchId: string) => { try { const result = await service.list(matchId); if (result.kind !== "ok") return NextResponse.json({ error: { code: "MATCH_NOT_FOUND", message: "Match unavailable." } }, { status: 404 }); return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } }); } catch { return NextResponse.json({ error: { code: "STREAMS_UNAVAILABLE", message: "Streams are temporarily unavailable." } }, { status: 503, headers: { "Cache-Control": "no-store" } }); } }; }
export async function GET(_request: Request, { params }: RouteContext<"/api/football/match/[matchId]/streams">) { const { matchId } = await params; return createStreamListHandler(getStreamService())(matchId); }
