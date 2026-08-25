import { describe, expect, it } from "vitest";
import { canonicalCompetition, resolveCompetitionVisualIdentity } from "./competition-identity";
import { deterministicInitials, resolveTeamVisualIdentity } from "./visual-identity";

describe("football visual identity", () => {
  it("gives aliases the same competition identity and maintained local logo", () => {
    expect(canonicalCompetition("EPL")).toEqual(canonicalCompetition("Premier League"));
    expect(resolveCompetitionVisualIdentity({ name: "EPL" })).toMatchObject({ slug: "premier-league", localLogo: "/leagues/premier-league.svg" });
  });

  it("keeps unknown competition fallbacks stable", () => {
    expect(resolveCompetitionVisualIdentity({ name: "Northern Star League" })).toMatchObject({ slug: "northern-star-league", fallbackInitials: "NSL", localLogo: undefined });
  });

  it("prefers trusted team metadata and computes deterministic fallback identity", () => {
    const team = { id: "a", slug: "arsenal", name: "Arsenal FC", shortName: "ARS", colors: ["#f00", "#fff"] as [string, string], crestUrl: "https://images.example/arsenal.webp" };
    expect(resolveTeamVisualIdentity(team)).toMatchObject({ key: "arsenal", sources: [team.crestUrl, undefined], fallbackInitials: "ARS" });
    expect(deterministicInitials(team.name, team.shortName)).toBe("ARS");
  });

  it("never promotes an insecure source above fallback", () => {
    const team = { id: "a", slug: "arsenal", name: "Arsenal", shortName: "ARS", colors: ["#f00", "#fff"] as [string, string], crestUrl: "http://images.example/arsenal.webp" };
    expect(resolveTeamVisualIdentity(team).sources).toEqual([undefined, undefined]);
  });
});

