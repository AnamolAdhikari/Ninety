import { describe, expect, it, vi } from "vitest";
import { normalizeStreamedMatch } from "@/server/providers/football/streamed.provider";
import { normalizeAuthorizedStream, StreamedStreamProvider } from "./streamed.provider";

const rawMatch = { id: "provider-match-secret", title: "Fulham vs Chelsea", category: "football", date: Date.parse("2026-08-24T19:00:00Z"), popular: true, teams: { home: { name: "Fulham" }, away: { name: "Chelsea" } }, sources: [{ source: "alpha", id: "source-secret" }] };
const matchId = normalizeStreamedMatch(rawMatch, new Set(), "https://provider.example")!.id;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
const streams = [{ id: "raw-two", streamNo: 2, language: "Spanish", hd: false, embedUrl: "https://embed.example/two", source: "alpha" }, { id: "raw-one", streamNo: 1, language: "English", hd: true, embedUrl: "https://embed.example/one", source: "alpha" }];

describe("StreamedStreamProvider", () => {
  it("maps a NINETY match to ordered authorized candidates with opaque IDs", async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => { void init; return String(input).includes("/api/matches/") ? json([rawMatch]) : json(streams); });
    const result = await new StreamedStreamProvider("https://provider.example", ["https://embed.example"], fetchMock as unknown as typeof fetch).getStreamsForMatch(matchId);
    expect(result.map((stream) => stream.streamNumber)).toEqual([1, 2]);
    expect(result[0]).toMatchObject({ language: "English", quality: "HD", hd: true, embedUrl: "https://embed.example/one" });
    expect(result[0].id).toMatch(/^stream-[a-f0-9]{12}$/);
    expect(JSON.stringify(result.map(({ id, language, quality }) => ({ id, language, quality })))).not.toMatch(/provider-match-secret|source-secret|raw-one|embed\.example/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, init]) => init?.cache === "no-store")).toBe(true);
  });

  it("returns no candidates for an unknown match or a match without sources", async () => {
    const fetcher = vi.fn(async () => json([{ ...rawMatch, sources: [] }])) as unknown as typeof fetch;
    expect(await new StreamedStreamProvider("https://provider.example", ["https://embed.example"], fetcher).getStreamsForMatch(matchId)).toEqual([]);
    expect(await new StreamedStreamProvider("https://provider.example", ["https://embed.example"], fetcher).getStreamsForMatch("unknown-match")).toEqual([]);
  });

  it("never substitutes a different fixture when exact identity is unavailable", async () => {
    const unrelated = { ...rawMatch, id: "different-provider-id", title: "Fulham vs Chelsea" };
    const fetcher = vi.fn(async () => json([unrelated])) as unknown as typeof fetch;
    expect(await new StreamedStreamProvider("https://provider.example", ["https://embed.example"], fetcher).getStreamsForMatch(matchId)).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed streams, insecure URLs, and unauthorized embed origins", () => {
    const origins = new Set(["https://embed.example"]);
    expect(normalizeAuthorizedStream(matchId, "alpha", {}, origins)).toBeNull();
    expect(normalizeAuthorizedStream(matchId, "alpha", { ...streams[0], embedUrl: "http://embed.example" }, origins)).toBeNull();
    expect(normalizeAuthorizedStream(matchId, "alpha", { ...streams[0], embedUrl: "https://other.example" }, origins)).toBeNull();
  });

  it("normalizes total upstream failure and malformed payloads", async () => {
    const failed = vi.fn(async (input: string | URL | Request) => String(input).includes("/api/matches/") ? json([rawMatch]) : json({}, 503)) as unknown as typeof fetch;
    await expect(new StreamedStreamProvider("https://provider.example", ["https://embed.example"], failed).getStreamsForMatch(matchId)).rejects.toMatchObject({ name: "StreamProviderError" });
    const malformed = vi.fn(async () => json({ matches: [] })) as unknown as typeof fetch;
    await expect(new StreamedStreamProvider("https://provider.example", ["https://embed.example"], malformed).getStreamsForMatch(matchId)).rejects.toMatchObject({ name: "StreamProviderError" });
  });
});
