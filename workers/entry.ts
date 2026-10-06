import handler from "vinext/server/fetch-handler";
import { authenticate, type AuthEnv } from "./auth";
import { messiData, messiPage } from "./messi";
export { MatchPresence } from "./presence";
export { NinetyAccounts } from "./accounts";
export default {
  async fetch(request: Request, env: AuthEnv & { ASSETS: Fetcher; MATCH_PRESENCE?: DurableObjectNamespace }, ctx: ExecutionContext) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/messi" && (request.method === "GET" || request.method === "HEAD")) return messiPage();
    if (pathname === "/messi/data" && request.method === "GET") return messiData();
    if (pathname === "/messi/presence" && request.method === "POST") {
      const headers={"Cache-Control":"no-store","Content-Type":"application/json"};
      if(!env.MATCH_PRESENCE)return Response.json({count:0},{status:503,headers});
      const raw=await request.text();
      if(raw.length>1024)return Response.json({count:0},{status:413,headers});
      let body:{visitor?:unknown;tab?:unknown;leave?:unknown};
      try{body=JSON.parse(raw);}catch{return Response.json({count:0},{status:400,headers});}
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const visitor=typeof body.visitor==="string"?body.visitor:"";
      const tab=typeof body.tab==="string"?body.tab:"";
      if(!uuid.test(visitor)||!uuid.test(tab))return Response.json({count:0},{status:400,headers});
      const stub=env.MATCH_PRESENCE.get(env.MATCH_PRESENCE.idFromName("messi-argentina-benin-20261006"));
      const response=await stub.fetch("https://presence.internal/",{method:"POST",body:JSON.stringify({visitor,tab,leave:body.leave===true})});
      return new Response(response.body,{status:response.status,headers:new Headers(response.headers)});
    }
    // Public cleanup worker carries no app content and removes obsolete offline caches.
    if (pathname === "/sw.js") return new Response(
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
