import { env } from "cloudflare:workers";
export async function POST(request: Request) {
  const headers={"Cache-Control":"no-store"};
  const origin=request.headers.get("Origin");
  if(!origin || origin!==new URL(request.url).origin)return new Response(null,{status:403,headers});
  try {
    const text=await request.text();if(text.length>1024)return new Response(null,{status:413,headers});
    const body=JSON.parse(text) as {match?:string;visitor?:string;tab?:string;leave?:boolean};
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if(!body.match || !/^[a-zA-Z0-9_-]{1,180}$/.test(body.match) || !uuid.test(body.visitor??"") || !uuid.test(body.tab??""))return new Response(null,{status:400,headers});
    const binding=(env as unknown as {MATCH_PRESENCE?:DurableObjectNamespace}).MATCH_PRESENCE;
    if(!binding)return new Response(null,{status:503,headers});
    const response=await binding.get(binding.idFromName(body.match)).fetch("https://presence.internal/",{method:"POST",body:JSON.stringify({visitor:body.visitor,tab:body.tab,leave:body.leave===true})});
    return new Response(response.body,{status:response.status,headers:new Headers(response.headers)});
  }catch{return new Response(null,{status:503,headers});}
}
