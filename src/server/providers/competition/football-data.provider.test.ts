import { describe, expect, it, vi } from "vitest";
import { competitionCacheSeconds, FINISHED_COMPETITION_REVALIDATE_SECONDS, FootballDataCompetitionProvider, LIVE_COMPETITION_REVALIDATE_SECONDS, normalizeFootballDataFixture, UPCOMING_COMPETITION_REVALIDATE_SECONDS } from "./football-data.provider";

const raw = { utcDate: "2026-08-23T18:00:00Z", area: { name: "England" }, competition: { id: 2021, name: "Premier League" }, homeTeam: { id: 1, name: "Arsenal FC" }, awayTeam: { id: 2, name: "Chelsea FC" } };

describe("FootballDataCompetitionProvider", () => {
  it("normalizes score, minute, and live status without leaking provider fields", () => expect(normalizeFootballDataFixture({ ...raw, status: "IN_PLAY", minute: 42, score: { fullTime: { home: 1, away: 2 }, duration: "REGULAR" } })).toEqual({ homeTeam: "Arsenal FC", awayTeam: "Chelsea FC", kickoff: "2026-08-23T18:00:00.000Z", competition: "Premier League", country: "England", status: "LIVE", minute: 42, homeScore: 1, awayScore: 2 }));
  it("rejects malformed fixtures and insecure origins", () => {
    expect(normalizeFootballDataFixture({ ...raw, utcDate: "invalid" })).toBeNull();
    expect(() => new FootballDataCompetitionProvider("http://api.example", "token")).toThrow("HTTPS");
  });
  it("uses a bounded window, token, timeout signal, and state-aware local cache", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ matches: [raw] }), { headers: { "Content-Type": "application/json" } }));
    const provider = new FootballDataCompetitionProvider("https://api.example/v4", "secret", fetchMock as unknown as typeof fetch, () => new Date("2026-08-23T12:00:00Z"));
    expect(await provider.getFixtures()).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(url.searchParams.get("dateFrom")).toBe("2026-08-21");
    expect(url.searchParams.get("dateTo")).toBe("2026-08-31");
    expect(init.headers).toEqual({ "X-Auth-Token": "secret" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });

  it("uses short live, normal upcoming, and longer finished cache windows", () => {
    const fixture = normalizeFootballDataFixture(raw)!;
    expect(competitionCacheSeconds([{ ...fixture, status: "LIVE" }])).toBe(LIVE_COMPETITION_REVALIDATE_SECONDS);
    expect(competitionCacheSeconds([{ ...fixture, status: "UPCOMING" }])).toBe(UPCOMING_COMPETITION_REVALIDATE_SECONDS);
    expect(competitionCacheSeconds([{ ...fixture, status: "FINISHED" }])).toBe(FINISHED_COMPETITION_REVALIDATE_SECONDS);
  });
});
