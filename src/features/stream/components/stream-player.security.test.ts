import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("normal watch player security", () => {
  it("retains the production iframe sandbox", () => {
    const source = readFileSync(new URL("./stream-player.tsx", import.meta.url), "utf8");
    expect(source).toContain('sandbox="allow-scripts allow-same-origin"');
    expect(source).not.toContain("allow-popups");
    expect(source).not.toContain("allow-top-navigation");
  });

  it("keeps the sandbox-failing provider iframe out of the production watch page", () => {
    const watchPage = readFileSync(new URL("../../../app/watch/[matchId]/page.tsx", import.meta.url), "utf8");
    const launcher = readFileSync(new URL("./secure-player-launcher.tsx", import.meta.url), "utf8");
    expect(watchPage).not.toContain("<StreamPlayer");
    expect(watchPage).toContain("<SecurePlayerLauncher");
    expect(launcher).not.toMatch(/<iframe|sandbox=/i);
    expect(launcher).toContain("rel={launcher.rel}");
    expect(launcher).toContain('referrerPolicy="no-referrer"');
  });
});
