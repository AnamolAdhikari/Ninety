import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("lightweight discovery routes", () => {
  it("keeps matches as a static client-hydrated shell with no direct service or stream access", () => {
    const page = source("src/app/matches/page.tsx");
    const content = source("src/features/discovery/components/matches-content.tsx");
    expect(page).not.toContain("force-dynamic");
    expect(page).not.toContain("getFootballService");
    expect(content).toContain("getMatchSchedule");
    expect(content).not.toMatch(/resolveStream|getStreams|streams\//);
  });

  it("removes football/all toggles and provides a compact starting-soon state", () => {
    const page = source("src/app/live/page.tsx");
    const content = source("src/features/discovery/components/live-content.tsx");
    expect(page).not.toContain("force-dynamic");
    expect(content).not.toContain("CompetitionChips");
    expect(content).toContain("No live football right now");
    expect(content).toContain("Starting soon");
    expect(content).not.toMatch(/KickoffCountdown|Starts in \{label\}/);
    expect(content).not.toMatch(/resolveStream|getStreams|streams\//);
  });

  it("uses shared red live state and intentional shelf overflow without negative gutters", () => {
    const dashboard = source("src/features/football/components/football-dashboard.tsx");
    const card = source("src/features/football/components/match-card.tsx");
    const header = source("src/features/shell/app-header.tsx");
    expect(dashboard).toContain("LiveIndicator");
    expect(card).toContain("LiveIndicator");
    expect(header).toContain("LiveIndicator");
    expect(dashboard).toContain("MatchShelf");
    expect(source("src/features/football/components/match-shelf.tsx")).toContain("overflow-x-auto");
    expect(dashboard).not.toContain("-mx-[var(--page-gutter)]");
  });

  it("uses centralized identity wrappers across discovery and watch surfaces", () => {
    for (const path of ["src/features/football/components/football-dashboard.tsx", "src/features/football/components/match-card.tsx", "src/features/football/components/match-score-header.tsx", "src/app/league/[slug]/page.tsx"]) expect(source(path)).toMatch(/TeamCrest|LeagueMark/);
  });
});
