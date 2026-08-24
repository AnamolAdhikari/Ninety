import "server-only";
import type { StreamListData, StreamPlaybackData } from "@/domain/stream/types";
import type { FootballService } from "./football.service";
import { getFootballService } from "./football.service";
import type { StreamProvider } from "@/server/providers/stream/provider";
import { createStreamProvider } from "@/server/providers/stream/provider.factory";
import { streamAvailability, type StreamAvailabilityCache } from "./stream-availability";

export type StreamLookupResult<T> = { kind: "ok"; data: T } | { kind: "match-not-found" } | { kind: "stream-not-found" };
export class StreamService {
  constructor(private readonly provider: StreamProvider, private readonly football: Pick<FootballService, "getMatchById">, private readonly availability: StreamAvailabilityCache = streamAvailability) {}
  async list(matchId: string): Promise<StreamLookupResult<StreamListData>> { if (!await this.football.getMatchById(matchId)) return { kind: "match-not-found" }; const streams = await this.provider.getStreamsForMatch(matchId); this.availability.set(matchId, streams.length > 0); return { kind: "ok", data: { streams: streams.map(({ id, language, quality, hd, streamNumber }) => ({ id, language, quality, hd, streamNumber })) } }; }
  async resolve(matchId: string, streamId: string): Promise<StreamLookupResult<StreamPlaybackData>> { if (!await this.football.getMatchById(matchId)) return { kind: "match-not-found" }; const stream = (await this.provider.getStreamsForMatch(matchId)).find((candidate) => candidate.id === streamId); if (!stream) return { kind: "stream-not-found" }; return { kind: "ok", data: { embedUrl: stream.embedUrl, expiresAt: stream.expiresAt } }; }
}
let service: StreamService | undefined;
export function getStreamService() { return service ??= new StreamService(createStreamProvider(), getFootballService()); }
