import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Team } from "@/domain/football/types";
import { TeamCrest } from "./team-crest";

const team: Team = { id: "arsenal", slug: "arsenal", name: "Arsenal", shortName: "ARS", colors: ["#f00", "#fff"], crestUrl: "https://images.example/api/images/badge/arsenal.webp" };

describe("TeamCrest", () => {
  it("preserves the validated remote URL without the optimizer proxy", () => {
    const html = renderToStaticMarkup(<TeamCrest team={team}/>);
    expect(html).toContain("https://images.example/api/images/badge/arsenal.webp");
    expect(html).not.toContain("/_next/image");
  });
  it("renders initials when a crest is genuinely missing", () => expect(renderToStaticMarkup(<TeamCrest team={{ ...team, crestUrl: undefined }}/>)).toContain("ARS"));
});
