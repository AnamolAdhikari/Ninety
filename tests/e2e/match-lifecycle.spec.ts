import { expect, test } from "@playwright/test";
import {
  ACTIVE_MATCH_HARD_CAP_MS,
  EXTRA_TIME_HARD_CAP_MS,
  MATCH_WINDOW_MS,
  isEffectivelyLive,
  isMatchEnded,
} from "../../app/match-lifecycle";

const kickoff = Date.UTC(2026, 9, 10, 18, 0, 0);
const source = [{ source: "test", id: "fixture" }];

test.describe("match lifecycle rules", () => {
  test("ordinary fixture ends after the standard match window", () => {
    const match = { date: kickoff };
    expect(isMatchEnded(match, kickoff + MATCH_WINDOW_MS - 1)).toBeFalsy();
    expect(isMatchEnded(match, kickoff + MATCH_WINDOW_MS)).toBeTruthy();
  });

  test("active provider status cannot keep a stale match live forever", () => {
    const match = { date: kickoff, matchStatus: "2H", live: true, apiSources: source };
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS - 1)).toBeFalsy();
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBeTruthy();
    expect(isEffectivelyLive(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBeFalsy();
  });

  test("extra time receives the longer hard cap", () => {
    const match = { date: kickoff, matchStatus: "ET", live: true, apiSources: source };
    expect(isMatchEnded(match, kickoff + ACTIVE_MATCH_HARD_CAP_MS)).toBeFalsy();
    expect(isMatchEnded(match, kickoff + EXTRA_TIME_HARD_CAP_MS)).toBeTruthy();
  });

  test("terminal provider status ends a fixture immediately", () => {
    for (const matchStatus of ["FT", "AET", "PEN", "CANC", "ABD", "AWD", "WO"]) {
      expect(isMatchEnded({ date: kickoff, matchStatus }, kickoff + 1)).toBeTruthy();
    }
  });

  test("scheduled and interrupted statuses are never effectively live", () => {
    for (const matchStatus of ["PST", "SUSP", "INT", "CANC", "ABD", "AWD", "WO"]) {
      expect(isEffectivelyLive({ date: kickoff, matchStatus, live: true, apiSources: source }, kickoff + 1)).toBeFalsy();
    }
  });

  test("effective live requires kickoff, provider live flag and a playable source", () => {
    const valid = { date: kickoff, live: true, apiSources: source };
    expect(isEffectivelyLive(valid, kickoff)).toBeTruthy();
    expect(isEffectivelyLive(valid, kickoff - 1)).toBeFalsy();
    expect(isEffectivelyLive({ ...valid, live: false }, kickoff + 1)).toBeFalsy();
    expect(isEffectivelyLive({ ...valid, apiSources: [] }, kickoff + 1)).toBeFalsy();
  });
});
