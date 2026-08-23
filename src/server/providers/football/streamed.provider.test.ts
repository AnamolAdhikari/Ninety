import { describe, expect, it, vi } from "vitest";
import { normalizeStreamedMatch, StreamedFootballProvider } from "./streamed.provider";

const rawMatch = { id: "source-42", title: "Arsenal vs Chelsea", category: "football", date: Date.parse("2026-08-23T18:00:00Z"), popular: true, teams: { home: { name: "Arsenal", badge: "/badge/arsenal.webp" }, away: { name: "Chelsea", badge: "http://unsafe.test/badge.png" } }, sources: [{ source: "hidden", id: "secret" }] };

describe("StreamedFootballProvider normalization", () => {
  it("maps provider data to NINETY models without leaking source IDs", () => {
    const match = normalizeStreamedMatch(rawMatch, new Set(["source-42"]), "https://streamed.pk", new Date("2026-08-23T18:30:00Z"));
    expect(match).toMatchObject({ slug: "arsenal-v-chelsea", status: "LIVE", popular: true, competition: "Football", home: { name: "Arsenal", crestUrl: "https://streamed.pk/badge/arsenal.webp" }, away: { name: "Chelsea" } });
    expect(match?.id).not.toContain("source-42");
    expect(JSON.stringify(match)).not.toContain("sources");
    expect(match?.away.crestUrl).toBeUndefined();
  });

  it("rejects malformed fields and non-football records", () => {
    expect(normalizeStreamedMatch({ ...rawMatch, category: "basketball" }, new Set(), "https://streamed.pk")).toBeNull();
    expect(normalizeStreamedMatch({ ...rawMatch, date: "tomorrow" }, new Set(), "https://streamed.pk")).toBeNull();
    expect(normalizeStreamedMatch({ ...rawMatch, teams: undefined, title: "Unknown event" }, new Set(), "https://streamed.pk")).toBeNull();
  });

  it("applies a timeout and normalizes upstream failures", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("nope", { status: 500 }));
    const provider = new StreamedFootballProvider("https://streamed.pk", fetcher);
    await expect(provider.getMatches()).rejects.toMatchObject({ name: "FootballProviderError", message: "Football data provider is unavailable." });
  });
});
