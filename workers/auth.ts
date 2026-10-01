import { accounts, type AccountEnv } from "./accounts";
export interface AuthEnv extends AccountEnv {
  NINETY_USERNAME?: string;
  API_FOOTBALL_KEY?: string;
  NINETY_PASSWORD?: string;
  NINETY_GUEST_USERNAME?: string;
  NINETY_GUEST_PASSWORD?: string;
  NINETY_SESSION_SECRET?: string;
  LOGIN_RATE_LIMITER?: { limit(options: {key: string}): Promise<{success: boolean}> };
}
const cookieName = "__Host-ninety-session";
const encoder = new TextEncoder();
const ttl = 12 * 60 * 60;
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
function page(message = "", status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NINETY · Private access</title><style>body{margin:0;background:#080c11;color:#f5f7fa;font:16px system-ui;min-height:100dvh;display:grid;place-items:center}main{width:min(360px,calc(100% - 64px));padding:32px;background:#111922;border:1px solid #283341;border-radius:24px}h1{margin:0;font-size:34px;letter-spacing:-1px}.live{color:#fa3348;font-size:12px;letter-spacing:2px}p{color:#aab6c5;line-height:1.6}label{display:block;margin:20px 0 8px}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:12px;font:inherit}input{background:#080e15;color:white;border:1px solid #354355}button{background:#d4ff38;border:0;font-weight:700;margin-top:24px;cursor:pointer}.error{color:#ff939e}
body{position:relative;isolation:isolate;overflow-x:hidden;background:radial-gradient(ellipse at 50% 0%,#172231 0%,#080c11 62%);padding:32px 0;box-sizing:border-box}
.ambient{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}.glow{position:absolute;width:65vmax;height:65vmax;border-radius:50%;opacity:.38;background:radial-gradient(circle,rgba(183,226,39,.15),transparent 65%);left:-24vmax;top:-24vmax;animation:ambient-drift 22s ease-in-out infinite alternate}.glow.second{left:auto;top:auto;right:-25vmax;bottom:-30vmax;background:radial-gradient(circle,rgba(68,127,198,.19),transparent 65%);animation-delay:-10s}.pitch{position:absolute;width:min(1100px,180vw);height:650px;left:50%;top:50%;border:1px solid rgba(183,207,218,.07);border-radius:12px;transform:translate(-50%,-50%) rotate(-18deg);background:repeating-linear-gradient(90deg,transparent 0,transparent 119px,rgba(183,207,218,.025) 120px,transparent 121px)}.pitch:before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:1px solid rgba(183,207,218,.08)}.pitch:after{content:"";position:absolute;width:200px;height:200px;left:50%;top:50%;transform:translate(-50%,-50%);border:1px solid rgba(183,207,218,.09);border-radius:50%}
main{box-sizing:border-box;width:min(424px,calc(100% - 32px));padding:36px;background:linear-gradient(145deg,rgba(23,33,46,.95),rgba(11,18,26,.97));border-color:#2c3948;box-shadow:0 28px 90px rgba(0,0,0,.4),inset 0 1px rgba(255,255,255,.04)}h1{font-weight:850;letter-spacing:-1.5px}.live{display:inline-flex;align-items:center;gap:7px;margin-top:8px;font-weight:750}.live i{width:6px;height:6px;border-radius:50%;background:#fa3348;box-shadow:0 0 0 5px rgba(250,51,72,.1)}label{font-size:14px;font-weight:650}input{transition:border-color .2s,box-shadow .2s}input:focus-visible{outline:0;border-color:#b6d936;box-shadow:0 0 0 3px rgba(212,255,56,.1)}button{min-height:48px;transition:background .18s,transform .18s}button:hover{background:#e0ff70}button:active{transform:translateY(1px)}button:focus-visible{outline:2px solid #f4ffb3;outline-offset:4px}.access-note{display:block;margin-top:22px;font-size:12px;text-align:center;color:#728295;letter-spacing:.02em}
@keyframes ambient-drift{to{transform:translate(10vw,8vh) scale(1.12)}}@media(prefers-reduced-motion:reduce){.glow{animation:none}input,button{transition:none}}@media(max-width:480px){body{padding:24px 0}main{padding:28px 24px;border-radius:20px}}
</style><div class="ambient" aria-hidden="true"><div class="glow"></div><div class="glow second"></div><div class="pitch"></div></div><main><h1>NINETY</h1><span class="live"><i></i>LIVE</span><p>Your private matchday. Sign in to continue.</p>${message?`<p class="error" role="alert">${escape(message)}</p>`:""}<form action="/auth/login" method="post"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="200"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button>Sign in</button></form><small class="access-note">Private access · Your matchday awaits</small></main></html>`, {status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'","X-Content-Type-Options":"nosniff","Referrer-Policy":"strict-origin-when-cross-origin"}});
}
async function key(secret: string) { return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]); }
function hex(buffer: ArrayBuffer) { return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join(""); }
async function digest(value: string) { return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value))); }
async function equal(a: string,b: string) { const x=await digest(a),y=await digest(b);let difference=0;for(let i=0;i<x.length;i++)difference|=x.charCodeAt(i)^y.charCodeAt(i);return difference===0; }
type Role = "owner" | "guest";
type Identity={role:Role|"friend";storageId:string};
function credentials(env: AuthEnv, role: Role) {
  if(role === "guest") {
    if(!env.NINETY_GUEST_USERNAME || !env.NINETY_GUEST_PASSWORD || env.NINETY_GUEST_USERNAME === env.NINETY_USERNAME) return null;
    return {username:env.NINETY_GUEST_USERNAME,password:env.NINETY_GUEST_PASSWORD};
  }
  return {username:env.NINETY_USERNAME!,password:env.NINETY_PASSWORD!};
}
async function valid(request: Request,env: AuthEnv): Promise<Identity|null> {
  const token=request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith(cookieName+"="))?.slice(cookieName.length+1);
  if(!token || token.length>256)return null;
  const parts=token.split(".");
  if(parts[0]==="friend") {
    const [role,id,version,expiry,nonce,signature]=parts;
    if(parts.length!==6||!/^([a-f0-9-]{36})$/.test(id)||!/^\d{1,8}$/.test(version)||!/^\d+$/.test(expiry)||!/^[a-f0-9]{32}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))return null;
    const now=Math.floor(Date.now()/1000);if(Number(expiry)<=now||Number(expiry)>now+ttl)return null;
    const bytes=new Uint8Array(signature.match(/../g)!.map(h=>parseInt(h,16)));
    if(!await crypto.subtle.verify("HMAC",await key(env.NINETY_SESSION_SECRET!),bytes,encoder.encode(parts.slice(0,5).join("."))))return null;
    const response=await accounts(env,"/session",{id,version:Number(version)});
    if(!response.ok)return null;
    const data=await response.json() as {account?:unknown};
    return data.account?{role:"friend",storageId:"friend:"+id}:null;
  }
  const legacy=parts.length===3;
  const role=legacy?"owner":parts[0];
  if((!legacy && parts.length!==4) || (role!=="owner" && role!=="guest"))return null;
  const [expiry,nonce,signature]=legacy?parts:parts.slice(1);
  if(!/^\d+$/.test(expiry)|| !/^[a-f0-9]{32}$/.test(nonce??"") || !/^[a-f0-9]{64}$/.test(signature??""))return null;
  const now=Math.floor(Date.now()/1000);if(Number(expiry)<=now || Number(expiry)>now+ttl)return null;
  const account=credentials(env,role);if(!account)return null;
  const prefix=legacy?`${expiry}.${nonce}`:`${role}.${expiry}.${nonce}`;
  const payload=`${prefix}.${await digest(account.username+"\0"+account.password)}`;
  const bytes=new Uint8Array(signature.match(/../g)!.map(h=>parseInt(h,16)));
  return await crypto.subtle.verify("HMAC",await key(env.NINETY_SESSION_SECRET!),bytes,encoder.encode(payload))?{role,storageId:role+":"+await digest(account.username)}:null;
}
export async function authenticate(request: Request,env: AuthEnv): Promise<Response|null> {
  const url=new URL(request.url);
  if(!env.NINETY_USERNAME || !env.NINETY_PASSWORD || !env.NINETY_SESSION_SECRET || env.NINETY_SESSION_SECRET.length<32 || !env.LOGIN_RATE_LIMITER) return page("Private access is being configured. Please try again later.",503);
  if(url.pathname==="/auth/logout") {
    if(request.method!=="POST")return new Response('<form method="post"><button>Sign out of NINETY</button></form>',{headers:{"Content-Type":"text/html","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; form-action 'self'; frame-ancestors 'none'"}});
    if(request.headers.get("origin")!==url.origin)return new Response("Forbidden",{status:403});
    return new Response(null,{status:303,headers:{Location:"/login","Set-Cookie":`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`,"Cache-Control":"no-store"}});
  }
  if(url.pathname==="/auth/login" && request.method==="POST") {
    if(request.headers.get("origin")!==url.origin)return new Response("Forbidden",{status:403});
    const rate=await env.LOGIN_RATE_LIMITER.limit({key:"login:"+(request.headers.get("CF-Connecting-IP")??"unknown")});
    if(!rate.success)return page("Too many attempts. Please wait a minute before trying again.",429);
    if(Number(request.headers.get("content-length")??0)>4096)return page("Invalid sign-in request.",400);
    const raw=await request.text();if(raw.length>4096)return page("Invalid sign-in request.",400);
    const form=new URLSearchParams(raw);const username=form.get("username")??"",password=form.get("password")??"";
    const guest=credentials(env,"guest");
    const checks=await Promise.all([equal(username,env.NINETY_USERNAME),equal(password,env.NINETY_PASSWORD),equal(username,guest?.username??""),equal(password,guest?.password??"")]);
    const role:Role|null=checks[0]&&checks[1]?"owner":guest&&checks[2]&&checks[3]?"guest":null;
    if(!role) {
      if(!env.NINETY_ACCOUNTS)return page("Incorrect username or password.",401);
      const response=await accounts(env,"/verify",{username,password});
      const data=await response.json() as {account?:{id:string;version:number}};
      if(!data.account)return page("Incorrect username or password.",401);
      const expiry=Math.floor(Date.now()/1000)+ttl,nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
      const prefix=`friend.${data.account.id}.${data.account.version}.${expiry}.${nonce}`;
      const signature=hex(await crypto.subtle.sign("HMAC",await key(env.NINETY_SESSION_SECRET),encoder.encode(prefix)));
      return new Response(null,{status:303,headers:{Location:"/","Set-Cookie":`${cookieName}=${prefix}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`,"Cache-Control":"no-store"}});
    }
    const account=credentials(env,role)!;
    const expiry=Math.floor(Date.now()/1000)+ttl;const nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const prefix=`${role}.${expiry}.${nonce}`;
    const payload=`${prefix}.${await digest(account.username+"\0"+account.password)}`;
    const signature=hex(await crypto.subtle.sign("HMAC",await key(env.NINETY_SESSION_SECRET),encoder.encode(payload)));
    return new Response(null,{status:303,headers:{Location:"/","Set-Cookie":`${cookieName}=${prefix}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`,"Cache-Control":"no-store"}});
  }
  const identity=await valid(request,env);
  if(identity) {
    const headers={"Cache-Control":"private, no-store"};
    if(url.pathname==="/api/account")return Response.json({...identity,sync:!!env.NINETY_ACCOUNTS},{headers});
    if(/^\/admin(?:\/|$)/.test(url.pathname) && identity.role!=="owner")return new Response("Owner access required",{status:403,headers});
    if(url.pathname.startsWith("/api/admin/")||url.pathname==="/api/preferences"||url.pathname==="/api/playback-report"||url.pathname==="/api/telemetry") {
      if(url.pathname.startsWith("/api/admin/")&&identity.role!=="owner")return Response.json({error:"Owner access required"},{status:403,headers});
      if(!["GET","POST"].includes(request.method))return new Response(null,{status:405,headers});
      if(request.method==="POST"&&request.headers.get("origin")!==url.origin)return new Response("Forbidden",{status:403,headers});
      let body:Record<string,unknown>={};
      if(request.method==="POST"){const raw=await request.text();if(raw.length>40000)return Response.json({error:"Request too large"},{status:413,headers});try{body=JSON.parse(raw);}catch{return Response.json({error:"Invalid request"},{status:400,headers});}if(!body||typeof body!=="object"||Array.isArray(body))return Response.json({error:"Invalid request"},{status:400,headers});}
      let response:Response;
      if(url.pathname==="/api/preferences")response=await accounts(env,"/preferences",{...body,account:identity.storageId});\n      else if(url.pathname==="/api/telemetry"&&request.method==="POST")response=await accounts(env,"/telemetry",{...body,account:identity.storageId});\n      else if(url.pathname==="/api/admin/telemetry"&&request.method==="GET")response=await accounts(env,"/telemetry-list",{});
      else if(url.pathname==="/api/admin/accounts"&&request.method==="GET"){const result=await accounts(env,"/list",{});if(!result.ok)return result;const data=await result.json() as Record<string,unknown>;response=Response.json({...data,services:{accounts:!!env.NINETY_ACCOUNTS,footballData:!!env.API_FOOTBALL_KEY}});}
      else if(url.pathname==="/api/admin/accounts"&&request.method==="POST") {
        const username=String(body.username??"").trim().toLowerCase();
        if([env.NINETY_USERNAME?.toLowerCase(),env.NINETY_GUEST_USERNAME?.toLowerCase()].includes(username))return Response.json({error:"That username is reserved."},{status:409,headers});
        response=await accounts(env,"/create",body);
      }
      else if(url.pathname==="/api/admin/account"&&request.method==="POST")response=await accounts(env,"/update",body);
      else if(url.pathname==="/api/playback-report"&&request.method==="POST"){const rate=await env.LOGIN_RATE_LIMITER.limit({key:"report:"+identity.storageId});if(!rate.success)return Response.json({ok:true},{headers});response=await accounts(env,"/health",{category:"source-retry"});}
      else return new Response(null,{status:404,headers});
      const protectedResponse=new Response(response.body,response);protectedResponse.headers.set("Cache-Control","private, no-store");return protectedResponse;
    }
    if(url.pathname==="/login")return new Response(null,{status:303,headers:{Location:"/",...headers}});
    return null;
  }
  if(url.pathname.startsWith("/api/"))return Response.json({error:"Authentication required"},{status:401,headers:{"Cache-Control":"no-store"}});
  if(url.pathname==="/login")return page();
  return new Response(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
}
