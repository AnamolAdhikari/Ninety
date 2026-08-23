import { describe, expect, it } from "vitest";
import type { FootballMatchCenterData, Match } from "@/domain/football/types";
import { createMatchHandler } from "./route";

const match: Match = { id: "ninety-match-a1", slug: "home-v-away", competition: "Football", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T12:00:00Z", home: { id: "home", slug: "home", name: "Home", shortName: "HOM", colors: ["#111", "#333"] }, away: { id: "away", slug: "away", name: "Away", shortName: "AWA", colors: ["#222", "#444"] } };

describe("GET /api/football/match/[matchId]", () => {
  it("returns a normalized match-center response", async () => {
    const data: FootballMatchCenterData = { match, related: [] };
    const response = await createMatchHandler({ getMatchCenter: async () => data })(match.id);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(data);
    expect(response.headers.get("cache-control")).toContain("s-maxage=60");
  });

  it("returns a clean 404 for an unknown NINETY ID", async () => {
    const response = await createMatchHandler({ getMatchCenter: async () => null })("unknown");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: { code: "MATCH_NOT_FOUND", message: "Match unavailable." } });
  });

  it("does not expose provider or stream metadata", async () => {
    const response = await createMatchHandler({ getMatchCenter: async () => ({ match, related: [] }) })(match.id);
    const body = JSON.stringify(await response.json());
    expect(body).not.toMatch(/provider|source|stream|embed|baseUrl/i);
  });
});
