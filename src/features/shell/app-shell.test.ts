import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isNavActive } from "./app-header";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared NINETY application shell", () => {
  it("mounts the canonical header once in the root layout", () => {
    const layout = source("src/app/layout.tsx");
    expect(layout.match(/<AppHeader\/>/g)).toHaveLength(1);
    expect(layout).toContain('<div id="main-content"');
  });

  it("does not duplicate or replace the shell on primary routes", () => {
    const routes = [
      "src/app/page.tsx",
      "src/app/live/page.tsx",
      "src/app/matches/page.tsx",
      "src/app/leagues/page.tsx",
      "src/app/league/[slug]/page.tsx",
      "src/app/club/[slug]/page.tsx",
      "src/app/watch/[matchId]/page.tsx",
    ];
    for (const route of routes) expect(source(route)).not.toMatch(/AppHeader|NINETY home|Match center/);
  });

  it("keeps league detail routes associated with the Leagues navigation item", () => {
    expect(isNavActive("/leagues", "/leagues")).toBe(true);
    expect(isNavActive("/league/premier-league", "/leagues")).toBe(true);
    expect(isNavActive("/live", "/leagues")).toBe(false);
  });

  it("keeps the isolated player shell separate", () => {
    const player = source("scripts/isolated-player/server.mjs");
    expect(player).toContain("NINETY isolated player");
    expect(player).not.toContain("AppHeader");
  });
});
