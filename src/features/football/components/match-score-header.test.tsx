import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import { MatchScoreHeader } from "./match-score-header";

describe("MatchScoreHeader", () => {
  it("renders a fixture without inventing optional score, minute, venue, or crest data", () => {
    const match: Match = { id: "one", slug: "alpha-v-beta", competition: "Football", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-23T12:00:00Z", home: { id: "alpha", slug: "alpha", name: "Alpha", shortName: "ALP", colors: ["#111", "#333"] }, away: { id: "beta", slug: "beta", name: "Beta", shortName: "BET", colors: ["#222", "#444"] } };
    const html = renderToStaticMarkup(<MatchScoreHeader match={match}/>);
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
    expect(html).toContain("VS");
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("N/A");
  });
});
