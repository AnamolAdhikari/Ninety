import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
describe("service worker policy", () => { it("never caches football APIs or playback routes", () => { const source = readFileSync(resolve(process.cwd(), "public/sw.js"), "utf8"); expect(source).toContain('url.pathname.startsWith("/api/")'); expect(source).toContain('url.pathname.startsWith("/watch/")'); expect(source).not.toContain('cache.addAll(["/"'); }); });
