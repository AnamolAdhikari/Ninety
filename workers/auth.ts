export interface AuthEnv {
  NINETY_USERNAME?: string;
  NINETY_PASSWORD?: string;
  NINETY_SESSION_SECRET?: string;
  LOGIN_RATE_LIMITER?: { limit(options: {key: string}): Promise<{success: boolean}> };
}
const cookieName = "__Host-ninety-session";
const encoder = new TextEncoder();
const ttl = 12 * 60 * 60;
function escape(value: string) { return value.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!)); }
function page(message = "", status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NINETY · Private access</title><style>body{margin:0;background:#080c11;color:#f5f7fa;font:16px system-ui;min-height:100dvh;display:grid;place-items:center}main{width:min(360px,calc(100% - 64px));padding:32px;background:#111922;border:1px solid #283341;border-radius:24px}h1{margin:0;font-size:34px;letter-spacing:-1px}.live{color:#fa3348;font-size:12px;letter-spacing:2px}p{color:#aab6c5;line-height:1.6}label{display:block;margin:20px 0 8px}input,button{box-sizing:border-box;width:100%;padding:14px;border-radius:12px;font:inherit}input{background:#080e15;color:white;border:1px solid #354355}button{background:#d4ff38;border:0;font-weight:700;margin-top:24px;cursor:pointer}.error{color:#ff939e}</style><main><h1>NINETY</h1><span class="live">● LIVE</span><p>Your private matchday. Sign in to continue.</p>${message?`<p class="error" role="alert">${escape(message)}</p>`:""}<form action="/auth/login" method="post"><label for="username">Username</label><input id="username" name="username" autocomplete="username" required maxlength="200"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button>Sign in</button></form></main></html>`, {status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}});
}
async function key(secret: string) { return crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign","verify"]); }
function hex(buffer: ArrayBuffer) { return Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,"0")).join(""); }
async function digest(value: string) { return hex(await crypto.subtle.digest("SHA-256",encoder.encode(value))); }
async function equal(a: string,b: string) { const x=await digest(a),y=await digest(b);let difference=0;for(let i=0;i<x.length;i++)difference|=x.charCodeAt(i)^y.charCodeAt(i);return difference===0; }
async function valid(request: Request,env: AuthEnv) {
  const token=request.headers.get("cookie")?.split(";").map(c=>c.trim()).find(c=>c.startsWith(cookieName+"="))?.slice(cookieName.length+1);
  if(!token || token.length>256)return false;
  const [expiry,nonce,signature]=token.split(".");
  if(!/^\d+$/.test(expiry)|| !/^[a-f0-9]{32}$/.test(nonce??"") || !/^[a-f0-9]{64}$/.test(signature??""))return false;
  const now=Math.floor(Date.now()/1000);if(Number(expiry)<=now || Number(expiry)>now+ttl)return false;
  const payload=`${expiry}.${nonce}.${await digest(env.NINETY_USERNAME!+"\0"+env.NINETY_PASSWORD!)}`;
  const bytes=new Uint8Array(signature.match(/../g)!.map(h=>parseInt(h,16)));
  return crypto.subtle.verify("HMAC",await key(env.NINETY_SESSION_SECRET!),bytes,encoder.encode(payload));
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
    const checks=await Promise.all([equal(username,env.NINETY_USERNAME),equal(password,env.NINETY_PASSWORD)]);
    if(!checks.every(Boolean))return page("Incorrect username or password.",401);
    const expiry=Math.floor(Date.now()/1000)+ttl;const nonce=hex(crypto.getRandomValues(new Uint8Array(16)).buffer);
    const payload=`${expiry}.${nonce}.${await digest(env.NINETY_USERNAME+"\0"+env.NINETY_PASSWORD)}`;
    const signature=hex(await crypto.subtle.sign("HMAC",await key(env.NINETY_SESSION_SECRET),encoder.encode(payload)));
    return new Response(null,{status:303,headers:{Location:"/","Set-Cookie":`${cookieName}=${expiry}.${nonce}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${ttl}`,"Cache-Control":"no-store"}});
  }
  if(await valid(request,env)) {
    if(url.pathname==="/login")return new Response(null,{status:303,headers:{Location:"/","Cache-Control":"no-store"}});
    return null;
  }
  if(url.pathname.startsWith("/api/"))return Response.json({error:"Authentication required"},{status:401,headers:{"Cache-Control":"no-store"}});
  if(url.pathname==="/login")return page();
  return new Response(null,{status:303,headers:{Location:"/login","Cache-Control":"no-store"}});
}
