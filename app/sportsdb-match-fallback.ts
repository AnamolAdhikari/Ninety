import { teamKey } from "./football-fixtures";
import type { MatchEvent } from "./match-snapshot";

type Event = { idEvent?: string; strHomeTeam?: string; strAwayTeam?: string; dateEvent?: string; strTimestamp?: string; strSport?: string };
type Timeline = { strTimeline?: string; strTimelineDetail?: string; strTeam?: string; strPlayer?: string; strAssist?: string; intTime?: string; strHome?: string };
type Lineup = { strHome?: string; strSubstitute?: string; strPlayer?: string; strPosition?: string; intSquadNumber?: string; idPlayer?: string; strThumb?: string; strCutout?: string };
type Side = { name: string; logo?: string; formation: null; confirmed: boolean; players: Array<{id?:number;name:string;number?:number|null;pos?:string;photo?:string}>; substitutes: Array<{id?:number;name:string;number?:number|null;pos?:string;photo?:string}>; coach: null };
const root = "https://www.thesportsdb.com/api/v1/json/123/";
const pending = new Map<string,Promise<unknown>>();
async function get<T>(path:string, ttl:number):Promise<T|null> {
  const key = new Request("https://ninety-cache.invalid/sportsdb-v1/"+encodeURIComponent(path));
  const cache = typeof caches === "undefined" ? undefined : (caches as unknown as {default:Cache}).default;
  const previous = await cache?.match(key);
  if(previous) return await previous.json() as T;
  const existing = pending.get(path);
  if(existing) return await existing as T;
  const task=(async()=>{
    const response=await fetch(root+path,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(6000),cf:{cacheEverything:true,cacheTtl:ttl}});
    if(!response.ok) return null;
    const data=await response.json() as T;
    await cache?.put(key,Response.json(data,{headers:{"Cache-Control":`public, max-age=${ttl}`}}));
    return data;
  })();
  pending.set(path,task);
  try{return await task;}catch{return null;}finally{pending.delete(path);}
}
async function resolve(home:string,away:string,date:number):Promise<Event|null>{
  const day=new Date(date).toISOString().slice(0,10);
  const query=new URLSearchParams({e:`${home}_vs_${away}`,d:day});
  const data=await get<{event?:Event[]|null;events?:Event[]|null}>(`searchevents.php?${query}`,600);
  const matches=(data?.event??data?.events??[]).filter(e=>{
    if(teamKey(e.strHomeTeam??"")!==teamKey(home)||teamKey(e.strAwayTeam??"")!==teamKey(away)||e.dateEvent!==day)return false;
    if(e.strSport&&e.strSport!=="Soccer")return false;
    if(e.strTimestamp){const start=Date.parse(e.strTimestamp);if(Number.isFinite(start)&&Math.abs(start-date)>90*60000)return false;}
    return true;
  });
  return matches.length===1&&/^\d+$/.test(matches[0].idEvent??"")?matches[0]:null;
}
export async function sportsDbEvents(home:string,away:string,date:number):Promise<MatchEvent[]|null>{
  const event=await resolve(home,away,date);
  if(!event)return null;
  const data=await get<{timeline?:Timeline[]|null}>(`lookuptimeline.php?id=${event.idEvent}`,120);
  if(!data?.timeline?.length)return null;
  const types:Record<string,MatchEvent["type"]>={goal:"Goal",card:"Card",substitution:"subst",subst:"subst",var:"Var"};
  const events=data.timeline.flatMap(row=>{
    const type=types[(row.strTimeline??"").toLowerCase()];
    if(!type)return [];
    const minute=Number(row.intTime);
    return [{minute:Number.isFinite(minute)?minute:null,extra:null,team:row.strTeam??(row.strHome==="Yes"?home:row.strHome==="No"?away:""),player:row.strPlayer??"",assist:row.strAssist??"",type,detail:row.strTimelineDetail??""}];
  });
  return events.length?events.slice(0,150):null;
}
export async function sportsDbLineups(home:string,away:string,date:number):Promise<{status:"confirmed"|"partial";source:"TheSportsDB";checkedAt:number;freshness:"fresh";home:Side;away:Side}|null>{
  const event=await resolve(home,away,date);
  if(!event)return null;
  const data=await get<{lineup?:Lineup[]|null}>(`lookuplineup.php?id=${event.idEvent}`,600);
  if(!data?.lineup?.length)return null;
  const side=(name:string,flag:string):Side=>{
    const convert=(sub:boolean)=>data.lineup!.filter(p=>p.strHome===flag&&p.strSubstitute===(sub?"Yes":"No")&&p.strPlayer?.trim()).map(p=>({
      ...(p.idPlayer&&Number.isFinite(Number(p.idPlayer))?{id:Number(p.idPlayer)}:{}),
      name:p.strPlayer!.trim(),number:p.intSquadNumber&&Number.isFinite(Number(p.intSquadNumber))?Number(p.intSquadNumber):null,
      pos:p.strPosition??undefined,photo:p.strThumb??p.strCutout??undefined,
    }));
    const players=convert(false);
    return {name,formation:null,confirmed:players.length===11,players,substitutes:convert(true),coach:null};
  };
  const h=side(home,"Yes"),a=side(away,"No");
  if(!h.players.length&&!a.players.length)return null;
  return {status:h.confirmed&&a.confirmed?"confirmed":"partial",source:"TheSportsDB",checkedAt:Date.now(),freshness:"fresh",home:h,away:a};
}
