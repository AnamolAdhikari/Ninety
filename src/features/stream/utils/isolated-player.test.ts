import { describe, expect, it } from "vitest";
import { getIsolatedPlayerLauncher } from "./isolated-player";

describe("isolated player launcher", () => {
  it("is available only in development with an opaque NINETY match ID", () => {
    expect(getIsolatedPlayerLauncher("development", "arsenal-v-chelsea-abc123")).toMatchObject({ target: "_blank", rel: "noopener noreferrer" });
    expect(getIsolatedPlayerLauncher("production", "arsenal-v-chelsea-abc123")).toBeNull();
    expect(getIsolatedPlayerLauncher("production", "arsenal-v-chelsea-abc123", "https://player.ninety.example")).toMatchObject({ href: "https://player.ninety.example/?match=arsenal-v-chelsea-abc123" });
    expect(getIsolatedPlayerLauncher("production", "arsenal-v-chelsea-abc123", "http://player.ninety.example")).toBeNull();
    expect(getIsolatedPlayerLauncher("test", "arsenal-v-chelsea-abc123")).toBeNull();
    expect(getIsolatedPlayerLauncher("development", "https://provider.example/raw")).toBeNull();
  });

  it("transports only the opaque match ID to the fixed local player origin", () => {
    const launcher = getIsolatedPlayerLauncher("development", "ninety-match-123");
    const url = new URL(launcher!.href);
    expect(url.origin).toBe("http://127.0.0.1:3006");
    expect([...url.searchParams.entries()]).toEqual([["match", "ninety-match-123"]]);
    expect(launcher!.href).not.toMatch(/embed|provider|source|streamed/i);
  });
});
