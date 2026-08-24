import { describe, expect, it } from "vitest";
import { StreamService } from "./stream.service";
import { StreamAvailabilityCache } from "./stream-availability";
const provider = { getStreamsForMatch: async () => [{ id: "opaque", language: "English", hd: true, embedUrl: "https://video.example/embed", upstream: "not-contract" } as never] };
describe("StreamService", () => {
  it("resolves NINETY match IDs and strips playback details from lists", async () => { const service = new StreamService(provider, { getMatchById: async () => ({ id: "match" } as never) }); const result = await service.list("match"); expect(result).toEqual({ kind: "ok", data: { streams: [{ id: "opaque", language: "English", quality: undefined, hd: true, streamNumber: undefined }] } }); expect(JSON.stringify(result)).not.toMatch(/video\.example|upstream/); });
  it("resolves only known opaque stream IDs", async () => { const service = new StreamService(provider, { getMatchById: async () => ({ id: "match" } as never) }); expect(await service.resolve("match", "opaque")).toEqual({ kind: "ok", data: { embedUrl: "https://video.example/embed", expiresAt: undefined } }); expect(await service.resolve("match", "source-id")).toEqual({ kind: "stream-not-found" }); });
  it("does not query streams for an unknown match", async () => { const service = new StreamService(provider, { getMatchById: async () => null }); expect(await service.list("unknown")).toEqual({ kind: "match-not-found" }); });
  it("caches only normalized approved source availability without extra lookups", async () => { let now = 0; const availability = new StreamAvailabilityCache(() => now); const service = new StreamService(provider, { getMatchById: async () => ({ id: "match" } as never) }, availability); expect(availability.get("match")).toBeUndefined(); await service.list("match"); expect(availability.get("match")).toBe(true); now = 30_001; expect(availability.get("match")).toBeUndefined(); });
});
