import { describe, expect, it, vi } from "vitest";
import { createPlaybackDiagnosticHandler } from "./route";

const config = () => ({ streamProvider: "streamed" as const, streamProviderBaseUrl: "https://provider.example", embedOrigins: ["https://embed.example"], footballProvider: "mock" as const, competitionProvider: "disabled" as const, siteUrl: "http://localhost:3000" });
const request = (watchUrl: string) => new Request("http://localhost/api/dev/playback-diagnostic", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ watchUrl }) });

describe("development playback diagnostic API", () => {
  it("returns only an opaque isolated launch URL in development", async () => {
    const resolve = vi.fn(async () => ({ title: "Known Good Match", language: "English", quality: "HD" as const, embedUrl: "https://embed.example/raw-player" }));
    const register = vi.fn(async () => "http://127.0.0.1:3006/?playback=playback-opaque123");
    const response = await createPlaybackDiagnosticHandler({ resolve, register, configuration: config }, "development")(request("https://provider.example/watch/fixture-123/admin/1"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ launchUrl: "http://127.0.0.1:3006/?playback=playback-opaque123" });
    expect(JSON.stringify(body)).not.toMatch(/fixture-123|admin|embed\.example|raw-player/);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects invalid input and is unavailable in production", async () => {
    const dependencies = { resolve: vi.fn(async () => null), register: vi.fn(), configuration: config };
    expect((await createPlaybackDiagnosticHandler(dependencies, "development")(request("https://evil.example/watch/x/admin/1"))).status).toBe(400);
    expect((await createPlaybackDiagnosticHandler(dependencies, "production")(request("https://provider.example/watch/x/admin/1"))).status).toBe(404);
    expect(dependencies.register).not.toHaveBeenCalled();
  });
});
