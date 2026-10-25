import { describe, expect, it } from "vitest";
import {
  ACTIVE_MATCH_HARD_CAP_MS,
  EXTRA_TIME_HARD_CAP_MS,
  MATCH_WINDOW_MS,
  isEffectivelyLive,
  isMatchEnded,
  canCheckBroadcast,
  BROADCAST_EARLY_MS,
  BROADCAST_POST_MATCH_CUTOFF_MS,
  BROADCAST_POST_MATCH_GRACE_MS,
} from "../../app/match-lifecycle";

const kickoff = Date.UTC(2026, 9, 10, 18, 0, 0);
const source = [{ source: "test", id: "fixture" }];

describe("match lifecycle rules", () => {
  it("ends an ordinary fixture at the standard match window", () => {
    expect(isMatchEnded({ date: kickoff }, kickoff + MATCH_WINDOW_MS - 1)).toBe(false);
    expect(isMatchEnded({ date: kickoff }, kickoff + MATCH_WINDOW_MS)).toBe(true);
  });

  it("hard-caps stale active provider states", () => {
    const match = { date: kickoff, matchStatus: "2H", live: true, apiSources: source };
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS - 1)).toBe(false);
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBe(true);
    expect(isEffectivelyLive(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBe(false);
  });

  it("allows the longer extra-time window", () => {
    const match = { date: kickoff, matchStatus: "ET", live: true, apiSources: source };
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBe(false);
    expect(isMatchEnded(match, kickoff + EXTRA_TIME_HARD_CAP_MS)).toBe(true);
  });

  it.each(["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"])("treats %s as terminal", matchStatus => {
    expect(isMatchEnded({ date: kickoff, matchStatus }, kickoff + 1)).toBe(true);
  });

  it.each(["PST", "SUSP", "INT", "CANC", "ABD", "AWD", "WO"])("never exposes %s as effectively live", matchStatus => {
    expect(isEffectivelyLive({ date: kickoff, matchStatus, live: true, apiSources: source }, kickoff + 1)).toBe(false);
  });

  it("requires kickoff, provider live flag and a playable source", () => {
    const valid = { date: kickoff, live: true, apiSources: source };
    expect(isEffectivelyLive(valid, kickoff)).toBe(true);
    expect(isEffectivelyLive(valid, kickoff - 1)).toBe(false);
    expect(isEffectivelyLive({ ...valid, live: false }, kickoff + 1)).toBe(false);
    expect(isEffectivelyLive({ ...valid, apiSources: [] }, kickoff + 1)).toBe(false);
  });

  it("does not infer an end time when kickoff is missing", () => {
    expect(isMatchEnded({ live: true }, kickoff)).toBe(false);
    expect(isEffectivelyLive({ live: true, apiSources: source }, kickoff)).toBe(false);
  });
});

describe("broadcast access window", () => {
  it("opens 15 minutes before kickoff only for matches with sources", () => {
    const match = { date: kickoff, matchStatus: "NS", apiSources: source };
    expect(canCheckBroadcast(match, kickoff - BROADCAST_EARLY_MS - 1)).toBe(false);
    expect(canCheckBroadcast(match, kickoff - BROADCAST_EARLY_MS)).toBe(true);
    expect(canCheckBroadcast({ ...match, apiSources: [] }, kickoff)).toBe(false);
  });
  it("keeps full-time and penalty broadcasts eligible while sources remain listed", () => {
    for (const matchStatus of ["FT", "AET", "PEN"]) {
      const match = { date: kickoff, matchStatus, apiSources: source };
      expect(isMatchEnded(match, kickoff + 130 * 60_000)).toBe(true);
      expect(canCheckBroadcast(match, kickoff + 130 * 60_000)).toBe(true);
      expect(canCheckBroadcast(match, kickoff + (matchStatus === "AET" || matchStatus === "PEN" ? EXTRA_TIME_HARD_CAP_MS + BROADCAST_POST_MATCH_GRACE_MS : BROADCAST_POST_MATCH_CUTOFF_MS) + 1)).toBe(false);
    }
  });
  it("uses 15 minutes after the estimated normal match end", () => {
    const match = {date:kickoff,matchStatus:"FT",apiSources:source};
    expect(canCheckBroadcast(match,kickoff+BROADCAST_POST_MATCH_CUTOFF_MS)).toBe(true);
    expect(canCheckBroadcast(match,kickoff+BROADCAST_POST_MATCH_CUTOFF_MS+1)).toBe(false);
  });
  it("does not check cancelled, postponed or suspended matches", () => {
    for (const matchStatus of ["CANC", "ABD", "AWD", "WO", "PST", "SUSP", "INT"])
      expect(canCheckBroadcast({date:kickoff,matchStatus,apiSources:source},kickoff)).toBe(false);
  });
});
