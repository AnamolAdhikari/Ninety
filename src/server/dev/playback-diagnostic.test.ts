import { describe, expect, it } from "vitest";
import { isPlaybackDiagnosticEnabled } from "./playback-diagnostic";

describe("playback diagnostic gating", () => {
  it("is unavailable outside development", () => {
    expect(isPlaybackDiagnosticEnabled("development")).toBe(true);
    expect(isPlaybackDiagnosticEnabled("production")).toBe(false);
    expect(isPlaybackDiagnosticEnabled("test")).toBe(false);
  });
});
