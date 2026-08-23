import { describe, expect, it } from "vitest";
import { getLeagueBranding, leagueBranding } from "./leagues";
describe("league branding", () => { it("maps the curated football competitions to local assets", () => { expect(Object.values(leagueBranding).every((brand) => brand.logo.startsWith("/leagues/") && brand.logo.endsWith(".svg"))).toBe(true); expect(getLeagueBranding("premier-league")?.logo).toBe("/leagues/premier-league.svg"); expect(getLeagueBranding("unknown-league")).toBeUndefined(); }); });
