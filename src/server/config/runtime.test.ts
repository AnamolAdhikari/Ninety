import { describe, expect, it } from "vitest";
import { developmentRoutesEnabled } from "./runtime";

describe("runtime route policy", () => {
  it("excludes development-only routes in production", () => {
    expect(developmentRoutesEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(developmentRoutesEnabled({ NODE_ENV: "development" })).toBe(true);
  });
});
