import { describe, expect, it } from "vitest";
import type { Competition } from "@/domain/football/types";
import { orderedCompetitions, orderedWorldCompetitions } from "@/domain/football/competition-order";

const competition = (slug: string, name = slug): Competition => ({ id: slug, slug, name, fixtureCount: 1, liveCount: 1, upcomingCount: 0, clubCount: 2 });

describe("competition filter ordering", () => {
  it("uses the shared preferred competition order and leaves Football last before All", () => {
    const unordered = [competition("europa-league"), competition("football", "Football"), competition("champions-league"), competition("serie-a"), competition("premier-league"), competition("ligue-1"), competition("bundesliga"), competition("la-liga")];
    expect(orderedCompetitions(unordered).map((item) => item.slug)).toEqual(["premier-league", "la-liga", "bundesliga", "serie-a", "ligue-1", "champions-league", "football", "europa-league"]);
    expect(orderedCompetitions(unordered).find((item) => item.slug === "football")?.liveCount).toBe(1);
  });

  it("uses the centralized world-navigation order including UEFA competitions", () => {
    const unordered = [competition("football"), competition("conference-league"), competition("champions-league"), competition("europa-league"), competition("serie-a"), competition("premier-league"), competition("ligue-1"), competition("bundesliga"), competition("la-liga")];
    expect(orderedWorldCompetitions(unordered).map((item) => item.slug)).toEqual(["premier-league", "la-liga", "bundesliga", "serie-a", "ligue-1", "champions-league", "europa-league", "conference-league", "football"]);
  });
});
