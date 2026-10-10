import { DurableObject } from "cloudflare:workers";
export type Friend = {id:string;username:string;enabled:number;version:number;created:number;lastLogin:number|null};
type StoredFriend = Friend & {salt:string;hash:string};
const enc=new TextEncoder();
const hex=(bytes:ArrayBuffer)=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("");
async function passwordHash(password:string,salt:string){const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);return hex(await crypto.subtle.deriveBits({name:"PBKDF2",hash:"SHA-256",salt:enc.encode(salt),iterations:100000},key,256));}
function same(a:string,b:string){let diff=a.length^b.length;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^(b.charCodeAt(i)??0);return diff===0;}
function preference(key:string,value:unknown):string|null {
  if(typeof value!=="string"||value.length>32000)return null;
  if(["ninety-favorites","ninety-reminders","ninety-teams"].includes(key)){try{const array=JSON.parse(value);if(!Array.isArray(array)||array.length>500||array.some(x=>typeof x!=="string"||x.length>200))return null;return JSON.stringify([...new Set(array)]);}catch{return null;}}
  if(key==="ninety-view")return ["cards","compact"].includes(value)?value:null;
  if(/^ninety-source:[a-zA-Z0-9._~-]{1,180}$/.test(key))return /^[a-z0-9-]{1,32}\|\d{1,4}$/.test(value)?value:null;
  return null;
}
export class NinetyAccounts extends DurableObject {
  constructor(ctx:DurableObjectState,env:Record<string,unknown>){super(ctx,env);ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,version INTEGER NOT NULL DEFAULT 1,created INTEGER NOT NULL,lastLogin INTEGER)");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS preferences(account TEXT NOT NULL,key TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(account,key))");ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS health(day TEXT NOT NULL,category TEXT NOT NULL,count INTEGER NOT NULL,PRIMARY KEY(day,category))");}
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
    if(path==="/list"){const health=sql.exec<{day:string;category:string;count:number}>("SELECT day,category,count FROM health WHERE day>=? ORDER BY day DESC,category",new Date(Date.now()-7*86400000).toISOString().slice(0,10)).toArray();const totals=Object.fromEntries(["match-feed-error","stream-api-error","stream-unavailable","football-data-error","source-retry"].map(category=>[category,health.filter(row=>row.category===category).reduce((sum,row)=>sum+row.count,0)]));return Response.json({accounts:sql.exec<Friend>("SELECT id,username,enabled,version,created,lastLogin FROM accounts ORDER BY created DESC").toArray(),health,healthSummary:{windowDays:7,total:health.reduce((sum,row)=>sum+row.count,0),totals,status:health.some(row=>row.day===new Date().toISOString().slice(0,10)&&row.count>0)?"attention":"healthy"}});}
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
    if(path==="/health") {const allowed=["match-feed-error","stream-api-error","stream-unavailable","football-data-error","source-retry"];const category=String(body.category);if(!allowed.includes(category))return Response.json({error:"Invalid category"},{status:400});const day=new Date().toISOString().slice(0,10);sql.exec("DELETE FROM health WHERE day<?",new Date(Date.now()-8*86400000).toISOString().slice(0,10));sql.exec("INSERT INTO health(day,category,count) VALUES(?,?,1) ON CONFLICT(day,category) DO UPDATE SET count=count+1",day,category);return Response.json({ok:true});}
    return new Response(null,{status:404});
  }
}
export interface AccountEnv { NINETY_ACCOUNTS?:DurableObjectNamespace; }
export async function accounts(env:AccountEnv,path:string,body:Record<string,unknown>){if(!env.NINETY_ACCOUNTS)return Response.json({error:"Account storage is not connected."},{status:503});const stub=env.NINETY_ACCOUNTS.get(env.NINETY_ACCOUNTS.idFromName("ninety-accounts-v1"));return stub.fetch("https://accounts.internal"+path,{method:"POST",body:JSON.stringify(body)});}
