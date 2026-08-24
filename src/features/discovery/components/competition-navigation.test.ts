import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { formatMatchStatus } from "@/features/football/utils/match-formatters";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("league discovery presentation", () => {
  it("renders one competition navigation directly after the league hero and before fixtures", () => {
    const page = source("src/app/league/[slug]/page.tsx");
    expect(page.match(/<CompetitionNavigation/g)).toHaveLength(1);
    expect(page.indexOf("<CompetitionNavigation")).toBeGreaterThan(page.indexOf("</header>"));
    expect(page.indexOf("<CompetitionNavigation")).toBeLessThan(page.indexOf("Participating clubs"));
    expect(page.indexOf("<CompetitionNavigation")).toBeLessThan(page.indexOf("sections.map"));
  });

  it("shares one request-scoped league snapshot between metadata and page rendering", () => {
    const page = source("src/app/league/[slug]/page.tsx");
    expect(page.match(/getLeaguePageData\(slug\)/g)).toHaveLength(2);
    expect(source("src/features/football/server/league-data.ts")).toContain("cache((slug: string)");
  });

  it("keeps finished match cards explicit", () => {
    expect(formatMatchStatus({ status: "FINISHED" } as never)).toBe("FT");
  });
});
