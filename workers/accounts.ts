import { DurableObject } from "cloudflare:workers";
export type Friend = {id:string;username:string;enabled:number;version:number;created:number;lastLogin:number|null};
type StoredFriend = Friend & {salt:string;hash:string};
const enc=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:100000},key,256));}
function same(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)??0);return diff===0;}
function telemetryDetail(event:string,value:unknown):string|null {
  const detail=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const text=(key:string,max:number)=>typeof detail[key]==="string"&&detail[key].length<=max?detail[key] as string:undefined;
  const boolean=(key:string)=>typeof detail[key]==="boolean"?detail[key] as boolean:undefined;
  let clean:Record<string,unknown>={};
  if(event==="session-active")clean={matchId:text("matchId",180),source:text("source",64),watching:boolean("watching")};
  else if(event==="watch-open")clean={requestedMatchId:text("requestedMatchId",180)};
  else if(event==="match-open")clean={matchId:text("matchId",180),home:text("home",100),away:text("away",100)};
  else if(event==="player-start"||event==="player-stop"||event==="source-failure")clean={matchId:text("matchId",180),source:text("source",64)};
  else if(event==="source-change")clean={matchId:text("matchId",180),from:text("from",64),to:text("to",64)};
  clean=Object.fromEntries(Object.entries(clean).filter(([,v])=>v!==undefined));
  const encoded=JSON.stringify(clean);
  return encoded==="{}"?null:encoded;
}
function preference(key:string,value:unknown):string|null {
  if(typeof value!=="string"||value.length>32000)return null;
  if(["ninety-favorites","ninety-reminders","ninety-teams"].includes(key)){try{const array=JSON.parse(value);if(!Array.isArray(array)||array.length>500||array.some(x=>typeof x!=="string"||x.length>200))return null;return JSON.stringify([...new Set(array)]);}catch{return null;}}
  if(key==="ninety-view")return ["cards","compact"].includes(value)?value:null;
  if(/^ninety-source:[a-zA-Z0-9._~-]{1,180}$/.test(key))return /^[a-z0-9-]{1,32}\|\d{1,4}$/.test(value)?value:null;
  return null;
}
export class NinetyAccounts extends DurableObject {
  constructor(ctx:DurableObjectState,env:Record<string,unknown>){super(ctx,env);ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,created INTEGER NOT NULL,lastLogin INTEGER)");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS preferences(account TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(account,key))");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS health(day TEXT NOT NULL,category TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(day,category))");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS telemetry(id TEXT PRIMARY KEY,account TEXT NOT NULL,event TEXT NOT NULL,detail TEXT,created INTEGER NOT NULL)");ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS telemetry_created ON telemetry(created DESC)");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS security_events(id TEXT PRIMARY KEY,event TEXT NOT NULL,actor TEXT,detail TEXT,created INTEGER NOT NULL)");ctx.storage.sql.exec("CREATE INDEX IF NOT EXISTS security_events_created ON security_events(created DESC)");}
  async fetch(request:Request){
    const path=new URL(request.url).pathname,sql=this.ctx.storage.sql;
    const body=await request.json() as Record<string,unknown>;
    if(path==="/verify"){
      const username=typeof body.username==="string"?body.username.toLowerCase():"",password=typeof body.password==="string"?body.password:"";
      const found=sql.exec<StoredFriend>("SELECT * FROM accounts WHERE username=?",username).toArray()[0];
      const hash=await passwordHash(password,found?.salt??"00000000000000000000000000000000");
      if(!found||!found.enabled||!same(hash,found.hash))return Response.json({account:null});
      // Re-check after hashing: disabling/resetting an account during login wins.
      const current=sql.exec<StoredFriend>("SELECT * FROM accounts WHERE id=?",found.id).toArray()[0];
      if(!current?.enabled||current.version!==found.version)return Response.json({account:null});
      sql.exec("UPDATE accounts SET lastLogin=? WHERE id=?",Date.now(),found.id);
      return Response.json({account:{id:found.id,version:found.version}});
    }
    if(path==="/session") {const found=sql.exec<Friend>("SELECT id,username,enabled,version,created,lastLogin FROM accounts WHERE id=?",String(body.id)).toArray()[0];return Response.json({account:found?.enabled&&found.version===body.version?found:null});}
    if(path==="/list")return Response.json({accounts:sql.exec<Friend>("SELECT id,username,enabled,version,created,lastLogin FROM accounts ORDER BY created DESC").toArray(),health:sql.exec("SELECT day,category,count FROM health WHERE day>=? ORDER BY day DESC,category",new Date(Date.now()-7*86400000).toISOString().slice(0,10)).toArray()});
    if(path==="/create") {
      const username=String(body.username??"").trim().toLowerCase(),password=String(body.password??"");
      if(!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(username)||password.length<12||password.length>200)return Response.json({error:"Use a 3–40 character username and a password with at least 12 characters."},{status:400});
      if(sql.exec<{total:number}>("SELECT COUNT(*) AS total FROM accounts").one().total>=100)return Response.json({error:"The 100-account limit has been reached."},{status:409});
      const salt=crypto.randomUUID(),hash=await passwordHash(password,salt),id=crypto.randomUUID();
      if(sql.exec<{total:number}>("SELECT COUNT(*) AS total FROM accounts").one().total>=100)return Response.json({error:"The 100-account limit has been reached."},{status:409});
      try{sql.exec("INSERT INTO accounts(id,username,salt,hash,created) VALUES(?,?,?,?,?)",id,username,salt,hash,Date.now());}catch{return Response.json({error:"That username is already in use."},{status:409});}
      return Response.json({id});
    }
    if(path==="/update") {
      const id=String(body.id),found=sql.exec<Friend>("SELECT id,username,enabled,version,created,lastLogin FROM accounts WHERE id=?",id).toArray()[0];if(!found)return Response.json({error:"Account not found."},{status:404});
      if(typeof body.enabled==="boolean")sql.exec("UPDATE accounts SET enabled=?,version=version+1 WHERE id=?",Number(body.enabled),id);
      else if(typeof body.password==="string"&&body.password.length>=12&&body.password.length<=200){const salt=crypto.randomUUID(),hash=await passwordHash(body.password,salt);sql.exec("UPDATE accounts SET salt=?,hash=?,version=version+1 WHERE id=?",salt,hash,id);}
      else return Response.json({error:"Invalid account update."},{status:400});
      return Response.json({ok:true});
    }
    if(path==="/preferences") {
      const account=String(body.account);
      if(!/^(owner|guest):[a-f0-9]{64}$/.test(account)&&!/^friend:[a-f0-9-]{36}$/.test(account))return Response.json({error:"Invalid account."},{status:400});
      if(body.key!==undefined){const key=String(body.key),value=preference(key,body.value);if(value===null)return Response.json({error:"Invalid preference."},{status:400});
        const old=sql.exec<{value:string}>("SELECT value FROM preferences WHERE account=? AND key=?",account,key).toArray()[0]?.value;
        if(!body.onlyIfMissing||old===undefined){
          let merged=value;
          if(old&&["ninety-favorites","ninety-reminders","ninety-teams"].includes(key)&&preference(key,body.previous)!==null){const current=new Set<string>(JSON.parse(old)),previous=new Set<string>(JSON.parse(String(body.previous))),next=new Set<string>(JSON.parse(value));for(const item of previous)if(!next.has(item))current.delete(item);for(const item of next)if(!previous.has(item))current.add(item);merged=JSON.stringify([...current].slice(0,500));}
          if(!old&&sql.exec<{total:number}>("SELECT COUNT(*) AS total FROM preferences WHERE account=?",account).one().total>=256){sql.exec("DELETE FROM preferences WHERE rowid IN (SELECT rowid FROM preferences WHERE account=? AND key LIKE 'ninety-source:%' ORDER BY rowid LIMIT 20)",account);if(sql.exec<{total:number}>("SELECT COUNT(*) AS total FROM preferences WHERE account=?",account).one().total>=256)return Response.json({error:"Preference limit reached."},{status:409});}
          sql.exec("INSERT INTO preferences(account,key,value) VALUES(?,?,?) ON CONFLICT(account,key) DO UPDATE SET value=excluded.value",account,key,merged);
        }
      }
      return Response.json({values:Object.fromEntries(sql.exec<{key:string;value:string}>("SELECT key,value FROM preferences WHERE account=?",account).toArray().map(row=>[row.key,row.value]))});
    }
    if(path==="/telemetry"){const account=String(body.account??""),event=String(body.event??"");if(!/^(owner|guest):[a-f0-9]{64}$/.test(account)&&!/^friend:[a-f0-9-]{36}$/.test(account))return Response.json({error:"Invalid account."},{status:400});const allowed=["session-active","watch-open","match-open","player-start","player-stop","source-change","source-failure"];if(!allowed.includes(event))return Response.json({error:"Invalid telemetry event."},{status:400});const detail=telemetryDetail(event,body.detail);sql.exec("DELETE FROM telemetry WHERE created<?",Date.now()-30*86400000);sql.exec("INSERT INTO telemetry(id,account,event,detail,created) VALUES(?,?,?,?,?)",crypto.randomUUID(),account,event,detail,Date.now());return Response.json({ok:true});}
    if(path==="/telemetry-list"){const since=Date.now()-7*86400000;return Response.json({events:sql.exec<{id:string;account:string;event:string;detail:string|null;created:number}>("SELECT id,account,event,detail,created FROM telemetry WHERE created>=? ORDER BY created DESC LIMIT 500",since).toArray()});}
    if(path==="/security-event"){
      const event=String(body.event??""),actor=body.actor==null?null:String(body.actor),detail=body.detail===undefined?null:JSON.stringify(body.detail);
      const allowed=["login-success","login-failure","rate-limited","access-denied","invalid-request","admin-action"];
      if(!allowed.includes(event)||actor&&actor.length>120||detail&&detail.length>2000)return Response.json({error:"Invalid security event."},{status:400});
      sql.exec("DELETE FROM security_events WHERE created<?",Date.now()-30*86400000);
      sql.exec("INSERT INTO security_events(id,event,actor,detail,created) VALUES(?,?,?,?,?)",crypto.randomUUID(),event,actor,detail,Date.now());
      return Response.json({ok:true});
    }
    if(path==="/security-list"){
      const since=Date.now()-7*86400000;
      return Response.json({events:sql.exec<{id:string;event:string;actor:string|null;detail:string|null;created:number}>("SELECT id,event,actor,detail,created FROM security_events WHERE created>=? ORDER BY created DESC LIMIT 500",since).toArray()});
    }
    if(path==="/health") {const allowed=["match-feed-error","stream-api-error","stream-unavailable","football-data-error","source-retry"];const category=String(body.category);if(!allowed.includes(category))return Response.json({error:"Invalid category"},{status:400});const day=new Date().toISOString().slice(0,10);sql.exec("DELETE FROM health WHERE day<?",new Date(Date.now()-8*86400000).toISOString().slice(0,10));sql.exec("INSERT INTO health(day,category,count) VALUES(?,?,1) ON CONFLICT(day,category) DO UPDATE SET count=count+1",day,category);return Response.json({ok:true});}
    return new Response(null,{status:404});
  }
}
export interface AccountEnv { NINETY_ACCOUNTS?:DurableObjectNamespace; }
export async function accounts(env:AccountEnv,path:string,body:Record<string,unknown>){if(!env.NINETY_ACCOUNTS)return Response.json({error:"Account storage is not connected."},{status:503});const stub=env.NINETY_ACCOUNTS.get(env.NINETY_ACCOUNTS.idFromName("ninety-accounts-v1"));return stub.fetch("https://accounts.internal"+path,{method:"POST",body:JSON.stringify(body)});}
