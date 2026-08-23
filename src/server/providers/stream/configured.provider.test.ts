import { describe, expect, it } from "vitest";
import { ConfiguredStreamProvider, normalizeCatalogStream } from "./configured.provider";
describe("ConfiguredStreamProvider", () => {
  it("normalizes authorized HTTPS entries to opaque IDs", () => { const stream = normalizeCatalogStream("ninety-match", { key: "licensed-main", embedUrl: "https://video.example/embed/42", language: "English", quality: "HD", hd: true }, 0); expect(stream).toMatchObject({ language: "English", quality: "HD", hd: true }); expect(stream?.id).toMatch(/^stream-[a-f0-9]{12}$/); expect(stream?.id).not.toContain("licensed-main"); });
  it("rejects invalid and insecure URLs", () => { expect(normalizeCatalogStream("match", { embedUrl: "http://video.example" }, 0)).toBeNull(); expect(normalizeCatalogStream("match", {}, 0)).toBeNull(); });
  it("returns only entries configured for a NINETY match", async () => { const provider = new ConfiguredStreamProvider(JSON.stringify({ "ninety-match": [{ embedUrl: "https://video.example/embed" }] })); expect(await provider.getStreamsForMatch("ninety-match")).toHaveLength(1); expect(await provider.getStreamsForMatch("unknown")).toEqual([]); });
});
