import { afterEach, describe, expect, it, vi } from "vitest";
import { createIsolatedPlayerServer, createIsolationHeaders, DiagnosticPlaybackRegistry, fetchNinetyApi, isOpaqueId, resolvePlayerRuntimeConfig } from "./server.mjs";

const servers = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve)))); });

describe("isolated player server", () => {
  it("accepts only opaque NINETY identifiers", () => {
    expect(isOpaqueId("arsenal-v-chelsea-ab123")).toBe(true);
    expect(isOpaqueId("https://provider.test/raw")).toBe(false);
  });

  it("uses restrictive no-store isolation headers", () => {
    const headers = createIsolationHeaders("https://embed.example");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
    expect(headers["Referrer-Policy"]).toBe("no-referrer");
    expect(headers["Cache-Control"]).toBe("no-store");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Cross-Origin-Resource-Policy"]).toBe("same-origin");
    expect(headers["Permissions-Policy"]).toContain("payment=()");
    expect(headers["Content-Security-Policy"]).toContain("frame-src https://embed.example");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
    expect(headers["Content-Security-Policy"]).toContain("form-action 'none'");
    expect(headers["Content-Security-Policy"]).not.toContain("frame-src *");
    expect(createIsolationHeaders("https://embed.example", ["https://images.example"])["Content-Security-Policy"]).toContain("img-src 'self' data: https://images.example");
  });

  it("never forwards browser cookies to the NINETY API", async () => {
    const fetcher = vi.fn(async () => new Response("{}"));
    await fetchNinetyApi("http://localhost:3000", "/api/test", fetcher);
    const init = fetcher.mock.calls[0][1];
    expect(init.credentials).toBe("omit");
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(JSON.stringify(init)).not.toMatch(/cookie|authorization/i);
  });

  it("serves an unsandboxed iframe only on the isolated surface", async () => {
    const server = createIsolatedPlayerServer(); servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const html = await (await fetch(`http://127.0.0.1:${address.port}/`)).text();
    const js = await (await fetch(`http://127.0.0.1:${address.port}/player.js`)).text();
    const css = await (await fetch(`http://127.0.0.1:${address.port}/player.css`)).text();
    expect(html).not.toMatch(/<iframe/i);
    expect(js).toContain("document.createElement('iframe')");
    expect(js).not.toMatch(/\.sandbox|setAttribute\(['\"]sandbox/i);
    expect(js).toContain("autoplay; fullscreen; picture-in-picture");
    expect(js).toContain("Invalid playback request");
    expect(js).toContain("params.get('match')");
    expect(js).toContain("params.get('playback')");
    expect(js).toContain("state.hidden=true");
    expect(css).toContain(".state[hidden]{display:none}");
    expect(css).toContain("pointer-events:none");
    expect(js).toContain("player-ready");
    expect(js).toContain("Still connecting…");
    expect(js).toContain("Playback unavailable for this source.");
    expect(js).toContain("another.addEventListener");
  });

  it("removes development diagnostics from the production player", async () => {
    const server = createIsolatedPlayerServer({ development: false }); servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); const origin = `http://127.0.0.1:${address.port}`;
    const html = await (await fetch(`${origin}/`)).text();
    expect(html).toContain("Stream loading?");
    expect(html).not.toMatch(/Development diagnostics|Manual playback check|Stream ID/);
    expect((await fetch(`${origin}/register`, { method: "POST" })).status).toBe(400);
    expect((await fetch(`${origin}/diagnostic/bootstrap?playback=playback-test`)).status).toBe(400);
  });

  it("requires explicit HTTPS origins for production runtime", () => {
    expect(() => resolvePlayerRuntimeConfig({ NODE_ENV: "production" })).toThrow("required");
    expect(() => resolvePlayerRuntimeConfig({ NODE_ENV: "production", NINETY_PLAYER_ORIGIN: "http://player.example", NINETY_PLAYER_APP_ORIGIN: "https://ninety.example" })).toThrow("HTTPS");
    expect(resolvePlayerRuntimeConfig({ NODE_ENV: "production", NINETY_PLAYER_ORIGIN: "https://player.ninety.example", NINETY_PLAYER_APP_ORIGIN: "https://ninety.example" })).toMatchObject({ production: true, playerOrigin: "https://player.ninety.example", appOrigin: "https://ninety.example" });
  });

  it("registers an opaque diagnostic token without leaking provider identifiers", async () => {
    const server = createIsolatedPlayerServer({ playerOrigin: "http://127.0.0.1:3006", embedOrigin: "https://embed.example", registrationKey: "test-key" }); servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); const origin = `http://127.0.0.1:${address.port}`;
    const registration = await fetch(`${origin}/register`, { method: "POST", headers: { "Content-Type": "application/json", "x-ninety-player-key": "test-key" }, body: JSON.stringify({ title: "Known Match", language: "English", quality: "HD", embedUrl: "https://embed.example/provider/admin/1" }) });
    expect(registration.status).toBe(201);
    const payload = await registration.json();
    expect(payload.launchUrl).toMatch(/^http:\/\/127\.0\.0\.1:3006\/\?playback=playback-[a-f0-9]+$/);
    expect(payload.launchUrl).not.toMatch(/Known|provider|admin|embed/i);
    const token = new URL(payload.launchUrl).searchParams.get("playback");
    const bootstrap = await fetch(`${origin}/diagnostic/bootstrap?playback=${token}`);
    expect(bootstrap.status).toBe(200);
    expect(JSON.stringify(await bootstrap.json())).not.toMatch(/embed\.example|provider\/admin/);
  });

  it("rejects unknown and expired diagnostic tokens", async () => {
    let now = 1_000; const registry = new DiagnosticPlaybackRegistry(10, () => now);
    const server = createIsolatedPlayerServer({ embedOrigin: "https://embed.example", registrationKey: "test-key", registry }); servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); const origin = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${origin}/diagnostic/bootstrap?playback=playback-unknown`)).status).toBe(404);
    const { token } = registry.register({ title: "Match", quality: "HD", embedUrl: "https://embed.example/player" }); now += 11;
    expect((await fetch(`${origin}/diagnostic/bootstrap?playback=${token}`)).status).toBe(404);
  });

  it("preserves the existing opaque match bootstrap flow", async () => {
    const fetcher = vi.fn(async (input) => String(input).endsWith("/streams")
      ? Response.json({ streams: [{ id: "stream-opaque123", language: "English", quality: "HD", embedUrl: "must-not-pass" }] })
      : Response.json({ match: { id: "match-opaque123", competition: "Football", status: "LIVE", home: { name: "Home" }, away: { name: "Away" } }, related: [] }));
    const server = createIsolatedPlayerServer({ fetcher }); servers.push(server);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/bootstrap?match=match-opaque123`);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.streams).toEqual([{ id: "stream-opaque123", language: "English", quality: "HD" }]);
    expect(JSON.stringify(body)).not.toContain("must-not-pass");
  });
});
