import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Match } from "@/domain/football/types";
import { MatchShelf } from "./match-shelf";

const match: Match = { id: "one", slug: "a-v-b", competition: "Premier League", stage: "Scheduled", status: "UPCOMING", popular: false, kickoff: "2026-08-24T20:00:00Z", home: { id: "a", slug: "a", name: "A", shortName: "A", colors: ["#000", "#fff"] }, away: { id: "b", slug: "b", name: "B", shortName: "B", colors: ["#111", "#eee"] } };

describe("match shelf layout", () => {
  it("uses deliberate mobile peek, exact desktop widths, snapping, and end padding", () => {
    const html = renderToStaticMarkup(<MatchShelf title="Premier League" matches={[match]} href="/league/premier-league"/>);
    expect(html).toContain("w-[84%]");
    expect(html).toContain("md:basis-[calc((100%_+_1rem_-_1.5rem)_/_3)]");
    expect(html).toContain("xl:basis-[calc((100%_+_1rem_-_2.25rem)_/_4)]");
    expect(html).toContain("snap-mandatory");
    expect(html).toContain("pr-4");
    expect(html).not.toContain("100vw");
  });

  it("does not render controls before measured overflow exists", () => {
    const html = renderToStaticMarkup(<MatchShelf title="Premier League" matches={[match]} href="/league/premier-league"/>);
    expect(html).not.toContain("Scroll Premier League matches right");
  });
});
