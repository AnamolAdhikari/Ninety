const baseUrl = (process.env.NINETY_SMOKE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");
const forbidden = /FOOTBALL_PROVIDER|FOOTBALL_COMPETITION|FOOTBALL_STREAM_CATALOG_JSON|sourceId|providerBaseUrl/i;

async function read(path, expected = 200) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const body = await response.text();
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}`);
  if (forbidden.test(body)) throw new Error(`${path}: server-only provider metadata was exposed`);
  return { response, body };
}

for (const path of ["/", "/live", "/matches", "/leagues", "/favorites", "/manifest.webmanifest", "/sw.js", "/robots.txt", "/sitemap.xml"]) await read(path);
const dashboard = await read("/api/football/dashboard");
const dashboardData = JSON.parse(dashboard.body);
await read(`/api/football/matches?date=${new Date().toISOString().slice(0, 10)}`);
await read("/api/football/search?q=real");

for (const header of ["content-security-policy", "referrer-policy", "x-content-type-options", "permissions-policy", "strict-transport-security"]) {
  if (!dashboard.response.headers.get(header)) throw new Error(`Missing production header: ${header}`);
}

const match = dashboardData.matches?.[0];
if (match?.id) {
  await read(`/watch/${encodeURIComponent(match.id)}`);
  const streams = await read(`/api/football/match/${encodeURIComponent(match.id)}/streams`);
  if (!streams.response.headers.get("cache-control")?.includes("no-store")) throw new Error("Stream list must be no-store");
  const stream = JSON.parse(streams.body).streams?.[0];
  if (stream?.id) {
    const resolution = await read(`/api/football/match/${encodeURIComponent(match.id)}/streams/${encodeURIComponent(stream.id)}`);
    if (!resolution.response.headers.get("cache-control")?.includes("no-store")) throw new Error("Stream resolution must be no-store");
  }
}

console.log(`NINETY Cloudflare smoke checks passed for ${baseUrl}`);
