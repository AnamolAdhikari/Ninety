import { describe, expect, it, vi } from "vitest";
import { parseDiagnosticWatchUrl, resolveDiagnosticWatchUrl } from "./diagnostic-watch";

const watchUrl = "https://provider.example/watch/known-good-fixture-123/admin/1";

describe("development diagnostic watch resolution", () => {
  it("accepts only configured HTTPS provider watch URLs", () => {
    expect(parseDiagnosticWatchUrl(watchUrl, "https://provider.example")).toEqual({ fixtureReference: "known-good-fixture-123", sourceName: "admin", streamNumber: 1 });
    expect(parseDiagnosticWatchUrl("https://evil.example/watch/known-good-fixture-123/admin/1", "https://provider.example")).toBeNull();
    expect(parseDiagnosticWatchUrl("http://provider.example/watch/known-good-fixture-123/admin/1", "https://provider.example")).toBeNull();
    expect(parseDiagnosticWatchUrl("https://provider.example/not-watch/123/admin/1", "https://provider.example")).toBeNull();
  });

  it("resolves the documented fixture and selected stream server-side", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).includes("/api/matches/")
      ? Response.json([{ id: "known-good-fixture-123", title: "Known Good Match", sources: [{ source: "admin", id: "raw-source" }] }])
      : Response.json([{ id: "raw-stream", streamNo: 1, language: "English", hd: true, embedUrl: "https://embed.example/player" }]));
    const result = await resolveDiagnosticWatchUrl(watchUrl, { providerBaseUrl: "https://provider.example", allowedEmbedOrigins: ["https://embed.example"], fetcher: fetcher as typeof fetch });
    expect(result).toEqual({ title: "Known Good Match", language: "English", quality: "HD", embedUrl: "https://embed.example/player" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
