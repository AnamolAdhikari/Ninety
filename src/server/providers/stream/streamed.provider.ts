import "server-only";
import { createHash } from "node:crypto";
import { normalizeStreamedMatch } from "@/server/providers/football/streamed.provider";
import type { ProviderStream, StreamProvider } from "./provider";
import { StreamProviderError } from "./stream-error";

type UnknownRecord = Record<string, unknown>;
type SourceReference = { source: string; id: string };
export const STREAM_PROVIDER_TIMEOUT_MS = 12_000;

const opaqueStreamId = (matchId: string, source: string, streamId: string) => `stream-${createHash("sha256").update(`${matchId}:${source}:${streamId}`).digest("hex").slice(0, 12)}`;
const record = (value: unknown): UnknownRecord | undefined => value && typeof value === "object" ? value as UnknownRecord : undefined;

export function normalizeAuthorizedStream(matchId: string, source: string, value: unknown, allowedEmbedOrigins: ReadonlySet<string>): ProviderStream | null {
  const item = record(value);
  if (!item || typeof item.id !== "string" || !item.id || typeof item.embedUrl !== "string") return null;
  let embedUrl: URL;
  try { embedUrl = new URL(item.embedUrl); } catch { return null; }
  if (embedUrl.protocol !== "https:" || !allowedEmbedOrigins.has(embedUrl.origin)) return null;
  const streamNumber = typeof item.streamNo === "number" && Number.isFinite(item.streamNo) ? item.streamNo : undefined;
  return { id: opaqueStreamId(matchId, source, item.id), embedUrl: embedUrl.toString(), language: typeof item.language === "string" ? item.language : undefined, quality: item.hd === true ? "HD" : "SD", hd: item.hd === true, streamNumber };
}

export class StreamedStreamProvider implements StreamProvider {
  private readonly allowedEmbedOrigins: ReadonlySet<string>;

  constructor(private readonly baseUrl: string, embedOrigins: string[], private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = STREAM_PROVIDER_TIMEOUT_MS) {
    let provider: URL;
    try { provider = new URL(baseUrl); } catch { throw new StreamProviderError("Stream provider origin is invalid."); }
    if (provider.protocol !== "https:") throw new StreamProviderError("Stream provider origin must use HTTPS.");
    this.allowedEmbedOrigins = new Set(embedOrigins);
  }

  async getStreamsForMatch(matchId: string): Promise<ProviderStream[]> {
    try {
      const response = await this.fetcher(`${this.baseUrl}/api/matches/football`, { cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) });
      if (!response.ok) throw new Error(`Fixture lookup returned ${response.status}.`);
      const payload: unknown = await response.json();
      if (!Array.isArray(payload)) throw new Error("Fixture lookup was malformed.");
      const rawMatch = payload.find((value) => normalizeStreamedMatch(value, new Set(), this.baseUrl)?.id === matchId);
      const item = record(rawMatch);
      if (!item) return [];
      const sources = Array.isArray(item.sources) ? item.sources.flatMap((value): SourceReference[] => {
        const source = record(value);
        return typeof source?.source === "string" && /^[a-z0-9-]{1,32}$/i.test(source.source) && typeof source.id === "string" && source.id.length > 0 && source.id.length <= 200 ? [{ source: source.source, id: source.id }] : [];
      }) : [];
      if (!sources.length) return [];
      const results = await Promise.allSettled(sources.map(async (source) => {
        const streamResponse = await this.fetcher(`${this.baseUrl}/api/stream/${encodeURIComponent(source.source)}/${encodeURIComponent(source.id)}`, { cache: "no-store", signal: AbortSignal.timeout(this.timeoutMs) });
        if (!streamResponse.ok) throw new Error(`Stream lookup returned ${streamResponse.status}.`);
        const streams: unknown = await streamResponse.json();
        if (!Array.isArray(streams)) throw new Error("Stream lookup was malformed.");
        return streams.map((stream) => normalizeAuthorizedStream(matchId, source.source, stream, this.allowedEmbedOrigins)).filter((stream): stream is ProviderStream => stream !== null);
      }));
      if (results.every((result) => result.status === "rejected")) throw new Error("All authorized stream lookups failed.");
      return [...new Map(results.flatMap((result) => result.status === "fulfilled" ? result.value : []).map((stream) => [stream.id, stream])).values()].sort((a, b) => (a.streamNumber ?? 999) - (b.streamNumber ?? 999));
    } catch (error) {
      throw new StreamProviderError("Authorized stream provider is unavailable.", { cause: error });
    }
  }
}
