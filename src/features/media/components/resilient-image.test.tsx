import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Team } from "@/domain/football/types";
import { TeamCrest } from "@/features/football/components/team-crest";
import { LeagueMark } from "@/features/football/components/league-mark";
import { deterministicInitials, ResilientImage, selectResilientSource } from "./resilient-image";

describe("resilient football identity images", () => {
  it.each([["Manchester City", undefined, "MC"], ["Real Betis", undefined, "RB"], ["Al-Nassr", undefined, "AN"], ["Paris Saint-Germain", "PSG", "PSG"]])("creates deterministic initials for %s", (name, preferred, expected) => expect(deterministicInitials(name, preferred)).toBe(expected));

  it("selects the next source after a failed remote without looping", () => expect(selectResilientSource(["https://bad.example/crest", "/badges/team-generic.svg"], new Set(["https://bad.example/crest"]))).toBe("/badges/team-generic.svg"));

  it("renders a valid remote crest with stable dimensions and a missing-crest fallback", () => {
    const team: Team = { id: "city", slug: "city", name: "Manchester City", shortName: "MCI", colors: ["#6cf", "#fff"], crestUrl: "https://images.example/city.webp" };
    const remote = renderToStaticMarkup(<TeamCrest team={team} size="small"/>);
    const missing = renderToStaticMarkup(<TeamCrest team={{ ...team, crestUrl: undefined }} size="small"/>);
    expect(remote).toContain("https://images.example/city.webp");
    expect(remote).toContain("h-10 w-10");
    expect(missing).toContain("team-generic.svg");
    expect(missing).toContain("MCI");
  });

  it("renders a maintained local crest before fallback", () => { const local: Team = { id: "local", slug: "local", name: "Local Club", shortName: "LC", colors: ["#111", "#222"], crestUrl: "/teams/local-club.svg" }; const html = renderToStaticMarkup(<TeamCrest team={local}/>); expect(html).toContain("/teams/local-club.svg"); expect(html).not.toContain("team-generic.svg"); });

  it("renders known local competition art and a stable generic fallback", () => {
    expect(renderToStaticMarkup(<LeagueMark slug="premier-league" name="Premier League"/>)).toContain("/leagues/premier-league.svg");
    const unknown = renderToStaticMarkup(<LeagueMark slug="unknown-cup" name="Unknown Cup"/>);
    expect(unknown).toContain("competition-generic.svg");
    expect(unknown).toContain("UC");
  });

  it("renders fallback content when no source is available", () => expect(renderToStaticMarkup(<ResilientImage sources={[]} fallback={<span>fallback</span>}/>)).toContain("fallback"));
});
