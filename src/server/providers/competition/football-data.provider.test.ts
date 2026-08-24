import { describe, expect, it, vi } from "vitest";
import { COMPETITION_METADATA_REVALIDATE_SECONDS, FootballDataCompetitionProvider, normalizeFootballDataFixture } from "./football-data.provider";

const raw = { utcDate: "2026-08-23T18:00:00Z", area: { name: "England" }, competition: { id: 2021, name: "Premier League" }, homeTeam: { id: 1, name: "Arsenal FC" }, awayTeam: { id: 2, name: "Chelsea FC" } };

describe("FootballDataCompetitionProvider", () => {
  it("normalizes only the provider-neutral fixture contract", () => expect(normalizeFootballDataFixture(raw)).toEqual({ homeTeam: "Arsenal FC", awayTeam: "Chelsea FC", kickoff: "2026-08-23T18:00:00.000Z", competition: "Premier League", country: "England" }));
  it("rejects malformed fixtures and insecure origins", () => {
    expect(normalizeFootballDataFixture({ ...raw, utcDate: "invalid" })).toBeNull();
    expect(() => new FootballDataCompetitionProvider("http://api.example", "token")).toThrow("HTTPS");
  });
  it("uses a bounded window, token, timeout signal, and longer metadata cache", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ matches: [raw] }), { headers: { "Content-Type": "application/json" } }));
    const provider = new FootballDataCompetitionProvider("https://api.example/v4", "secret", fetchMock as unknown as typeof fetch, () => new Date("2026-08-23T12:00:00Z"));
    expect(await provider.getFixtures()).toHaveLength(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit & { next: { revalidate: number } }];
    expect(url.searchParams.get("dateFrom")).toBe("2026-08-21");
    expect(url.searchParams.get("dateTo")).toBe("2026-08-31");
    expect(init.headers).toEqual({ "X-Auth-Token": "secret" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.next.revalidate).toBe(COMPETITION_METADATA_REVALIDATE_SECONDS);
  });
});
