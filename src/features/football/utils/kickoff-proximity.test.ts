import { describe, expect, it } from "vitest";
import { formatKickoffProximity } from "./kickoff-proximity";
const now = new Date(2026, 7, 24, 10, 0, 0);
const at = (day: number, hour: number, minute = 0) => new Date(2026, 7, day, hour, minute).toISOString();
describe("formatKickoffProximity", () => {
  it("uses minutes inside an hour", () => expect(formatKickoffProximity(at(24, 10, 42), now)).toBe("Starts in 42 min"));
  it("uses hours only for nearby fixtures", () => expect(formatKickoffProximity(at(24, 12, 15), now)).toBe("Starts in 2h 15m"));
  it("uses a same-day clock", () => expect(formatKickoffProximity(at(24, 20), now)).toMatch(/^Today · /));
  it("uses tomorrow for the next day", () => expect(formatKickoffProximity(at(25, 14), now)).toMatch(/^Tomorrow · /));
  it("uses a weekday for multi-day fixtures", () => expect(formatKickoffProximity(at(28, 14), now)).toMatch(/^Fri · /));
  it("uses a date farther away", () => expect(formatKickoffProximity(at(31, 14), now)).toMatch(/^Aug 31 · /));
});
