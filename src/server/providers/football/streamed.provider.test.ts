import { describe, expect, it, vi } from "vitest";
import { buildStreamedBadgeUrl, normalizeStreamedMatch, readStreamedCompetition, STREAMED_METADATA_TIMEOUT_MS, StreamedFootballProvider } from "./streamed.provider";

const rawMatch = { id: "source-42", title: "Arsenal vs Chelsea", category: "football", date: Date.parse("2027-08-23T18:00:00Z"), popular: true, teams: { home: { name: "Arsenal", badge: "arsenal-badge" }, away: { name: "Chelsea" } }, sources: [{ source: "hidden", id: "secret" }] };
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

describe("StreamedFootballProvider normalization", () => {
  it("builds badge image URLs from opaque badge identifiers", () => {
    expect(buildStreamedBadgeUrl("https://streamed.pk", "arsenal-badge")).toBe("https://streamed.pk/api/images/badge/arsenal-badge.webp");
    expect(buildStreamedBadgeUrl("https://streamed.pk/", "club badge/ä")).toBe("https://streamed.pk/api/images/badge/club%20badge%2F%C3%A4.webp");
    expect(buildStreamedBadgeUrl("https://streamed.pk", "https://streamed.pk/api/images/badge/arsenal.webp")).toBe("https://streamed.pk/api/images/badge/arsenal.webp");
    expect(buildStreamedBadgeUrl("https://streamed.pk", "/api/images/badge/arsenal.webp")).toBe("https://streamed.pk/api/images/badge/arsenal.webp");
    expect(buildStreamedBadgeUrl("https://streamed.pk", "https://untrusted.example/arsenal.webp")).toBeUndefined();
    expect(buildStreamedBadgeUrl("https://streamed.pk", "")).toBeUndefined();
    expect(buildStreamedBadgeUrl("https://streamed.pk", undefined)).toBeUndefined();
    expect(buildStreamedBadgeUrl("http://streamed.pk", "arsenal-badge")).toBeUndefined();
    expect(buildStreamedBadgeUrl("https://streamed.pk", "/arsenal-badge")).not.toBe("https://streamed.pk/arsenal-badge");
  });

  it("maps provider data to NINETY models without leaking source IDs", () => {
    const match = normalizeStreamedMatch(rawMatch, new Set(["source-42"]), "https://streamed.pk", new Date("2027-08-23T18:30:00Z"));
    expect(match).toMatchObject({ slug: "arsenal-v-chelsea", status: "LIVE", popular: true, competition: "Football", home: { name: "Arsenal", crestUrl: "https://streamed.pk/api/images/badge/arsenal-badge.webp" }, away: { name: "Chelsea" } });
    expect(match?.id).not.toContain("source-42");
    expect(JSON.stringify(match)).not.toContain("sources");
    expect(match?.away.crestUrl).toBeUndefined();
  });

  it("preserves only explicit competition metadata with a stable fallback", () => {
    expect(readStreamedCompetition({ competition: { name: " Major  League   Soccer ", country: { name: "United States" }, id: "raw-id" } })).toEqual({ name: "Major League Soccer", country: "United States" });
    expect(readStreamedCompetition({ league: "Liga MX" })).toEqual({ name: "Liga MX" });
    expect(readStreamedCompetition({ tournament: { title: "Copa Libertadores" }, country: "South America" })).toEqual({ name: "Copa Libertadores", country: "South America" });
    expect(readStreamedCompetition({ category: "football", title: "Arsenal vs Chelsea", teams: rawMatch.teams })).toBeUndefined();
    expect(normalizeStreamedMatch({ ...rawMatch, competition: "Premier League" }, new Set(), "https://streamed.pk")?.competition).toBe("Premier League");
    expect(normalizeStreamedMatch(rawMatch, new Set(), "https://streamed.pk")?.competition).toBe("Football");
  });

  it("rejects malformed fields and non-football records", () => {
    expect(normalizeStreamedMatch({ ...rawMatch, category: "basketball" }, new Set(), "https://streamed.pk")).toBeNull();
    expect(normalizeStreamedMatch({ ...rawMatch, date: "tomorrow" }, new Set(), "https://streamed.pk")).toBeNull();
    expect(normalizeStreamedMatch({ ...rawMatch, teams: undefined, title: "Unknown event" }, new Set(), "https://streamed.pk")).toBeNull();
  });

  it("uses the production-safe metadata timeout", () => expect(STREAMED_METADATA_TIMEOUT_MS).toBe(15_000));

  it("fetches primary and live metadata concurrently", async () => {
    const requested: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => { requested.push(String(input)); return String(input).endsWith("/live") ? json([{ id: "source-42" }]) : json([rawMatch]); }) as unknown as typeof fetch;
    const matches = await new StreamedFootballProvider("https://streamed.pk", fetcher).getMatches();
    expect(requested).toEqual(["https://streamed.pk/api/matches/football", "https://streamed.pk/api/matches/live"]);
    expect(matches[0].status).toBe("LIVE");
  });

  it("returns primary matches when live enrichment fails", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/live") ? json({ malformed: true }) : json([rawMatch])) as unknown as typeof fetch;
    const matches = await new StreamedFootballProvider("https://streamed.pk", fetcher).getMatches();
    expect(matches).toHaveLength(1);
    expect(matches[0].status).toBe("UPCOMING");
    expect(matches[0].stage).toBe("Scheduled");
  });

  it("keeps timeout protection and normalizes primary failures", async () => {
    const fetcher = vi.fn((_input: string | URL | Request, init?: RequestInit) => new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true }))) as unknown as typeof fetch;
    const provider = new StreamedFootballProvider("https://streamed.pk", fetcher, 5);
    await expect(provider.getMatches()).rejects.toMatchObject({ name: "FootballProviderError", message: "Football data provider is unavailable.", cause: { name: "TimeoutError" } });
  });

  it("normalizes primary HTTP failures even if live succeeds", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/live") ? json([]) : json({}, 500)) as unknown as typeof fetch;
    await expect(new StreamedFootballProvider("https://streamed.pk", fetcher).getMatches()).rejects.toMatchObject({ name: "FootballProviderError", message: "Football data provider is unavailable." });
  });
});
