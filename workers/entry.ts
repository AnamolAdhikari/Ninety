import handler from "vinext/server/fetch-handler";
import { authenticate, type AuthEnv } from "./auth";
export { MatchPresence } from "./presence";
export default {
  async fetch(request: Request, env: AuthEnv & { ASSETS: Fetcher }, ctx: ExecutionContext) {
    // Public cleanup worker carries no app content and removes obsolete offline caches.
    if (new URL(request.url).pathname === "/sw.js") return new Response(
      `self.addEventListener("install",()=>self.skipWaiting());self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("ninety-")).map(key=>caches.delete(key)))).then(()=>self.clients.claim()).then(()=>self.registration.unregister())));`,
      { headers: { "Content-Type": "application/javascript", "Cache-Control": "no-store" } },
    );
    const blocked = await authenticate(request, env);
    if (blocked) return blocked;
    let response: Response | undefined;
    if (request.method === "GET" || request.method === "HEAD") {
      const asset = await env.ASSETS.fetch(request);
      if (asset.status !== 404) response = asset;
    }
    const resolved: Response = response ?? await handler.fetch(request, env, ctx);
    const protectedResponse = new Response(resolved.body, resolved);
    protectedResponse.headers.set("Cache-Control", "private, no-store");
    return protectedResponse;
  },
};
