import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("normal watch player security", () => {
  it("retains the production iframe sandbox", () => {
    const source = readFileSync(new URL("./stream-player.tsx", import.meta.url), "utf8");
    expect(source).toContain('sandbox="allow-scripts allow-same-origin"');
    expect(source).not.toContain("allow-popups");
    expect(source).not.toContain("allow-top-navigation");
  });
});
