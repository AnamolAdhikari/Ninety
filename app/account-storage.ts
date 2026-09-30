/** Preferences belong to a server-verified account; local copies keep the UI responsive. */
type Account={role:"owner"|"guest"|"friend";storageId:string;sync:boolean};
let account:Account|null=null,pending:Promise<void>|null=null;
let cloud:Record<string,string>={},loading=false,queue:Promise<unknown>=Promise.resolve();
type Change={key:string;value:string;previous:string|null};
let outbox:Change[]=[];
function persistOutbox(){localWrite("sync-outbox",JSON.stringify(outbox));}
const syncKey=(key:string)=>["ninety-favorites","ninety-reminders","ninety-teams","ninety-view"].includes(key)||key.startsWith("ninety-source:");
export function accountRole(){return account?.role;}
function localKey(key:string){return `ninety-account:${account!.storageId}:${key}`;}
function localRead(key:string){try{return window.localStorage.getItem(localKey(key));}catch{return null;}}
function localWrite(key:string,value:string){try{window.localStorage.setItem(localKey(key),value);}catch{}}
function notify(status:string){window.dispatchEvent(new CustomEvent("ninety-sync",{detail:status}));}
async function readCloud(){if(!account?.sync)return;const response=await fetch("/api/preferences",{cache:"no-store",signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error("Preference sync unavailable");const data=await response.json() as {values:Record<string,string>};cloud=data.values;for(const [key,value] of Object.entries(cloud))if(!outbox.some(change=>change.key===key))localWrite(key,value);}
async function save(key:string,value:string,previous:string|null,onlyIfMissing=false){const response=await fetch("/api/preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key,value,previous:previous??(["ninety-favorites","ninety-reminders","ninety-teams"].includes(key)?"[]":null),onlyIfMissing}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error("Preference sync unavailable");const data=await response.json() as {values:Record<string,string>};cloud=data.values;}
async function drain(){while(outbox.length){const change=outbox[0];await save(change.key,change.value,change.previous);outbox.shift();persistOutbox();if(!outbox.some(item=>item.key===change.key)&&cloud[change.key]!==undefined)localWrite(change.key,cloud[change.key]);}}
function enqueue(key:string,value:string,previous:string|null){outbox.push({key,value,previous});persistOutbox();queue=queue.catch(()=>{}).then(async()=>{notify("saving");try{await drain();window.dispatchEvent(new Event("ninety-preferences"));notify("synced");}catch{notify("offline");}});}
export function initializeAccountStorage():Promise<void>{
  if(!pending)pending=(async()=>{
    const response=await fetch("/api/account",{cache:"no-store"});if(!response.ok)throw new Error("Account session unavailable");
    const value=await response.json() as Account;
    if(!value||!['owner','guest','friend'].includes(value.role)||!(/^(owner|guest):[a-f0-9]{64}$/.test(value.storageId)||/^friend:[a-f0-9-]{36}$/.test(value.storageId))||!value.storageId.startsWith(value.role+":"))throw new Error("Invalid account identity");
    account=value;
    try{const stored=JSON.parse(localRead("sync-outbox")||"[]");if(Array.isArray(stored))outbox=stored.filter(change=>change&&syncKey(change.key)&&typeof change.value==="string");}catch{}
    // Move legacy owner-only preferences into its account scope.
    if(account.role==="owner")for(const key of ['ninety-favorites','ninety-reminders','ninety-teams','ninety-view','ninety-notified'])try{if(localRead(key)===null){const old=window.localStorage.getItem(key);if(old!==null){localWrite(key,old);window.localStorage.removeItem(key);}}}catch{}
    if(account.sync){try{await drain();await readCloud();
      // Import each browser value only if this account has no cloud value yet.
      const keys=Object.keys(window.localStorage).filter(key=>key.startsWith(`ninety-account:${account!.storageId}:`)).map(key=>key.slice(`ninety-account:${account!.storageId}:`.length));
      for(const key of keys.filter(syncKey)){const local=localRead(key);if(local!==null&&cloud[key]===undefined)await save(key,local,null,true);}
      for(const [key,value] of Object.entries(cloud))if(!outbox.some(change=>change.key===key))localWrite(key,value);
      notify("synced");
    }catch{notify("offline");}}
    const refresh=async()=>{if(document.hidden||loading||!account?.sync)return;loading=true;try{await queue.catch(()=>{});await drain();await readCloud();window.dispatchEvent(new Event("ninety-preferences"));notify("synced");}catch{notify("offline");}finally{loading=false;}};
    window.addEventListener("focus",()=>void refresh());window.addEventListener("online",()=>void refresh());
    window.setInterval(()=>void refresh(),60000);
  })().catch(error=>{pending=null;throw error;});return pending;
}
export const accountStorage={
  getItem(key:string):string|null{return account?localRead(key):null;},
  setItem(key:string,value:string){if(!account)return;const previous=localRead(key);if(previous===value)return;localWrite(key,value);if(account.sync&&syncKey(key))enqueue(key,value,previous);},
};
