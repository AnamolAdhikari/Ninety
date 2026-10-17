import { teamKey } from "./football-fixtures";

type SportsDbEvent = {
  strHomeTeam?: string | null;
  strAwayTeam?: string | null;
  intHomeScore?: string | number | null;
  intAwayScore?: string | number | null;
  dateEvent?: string | null;
  strStatus?: string | null;
  strTimestamp?: string | null;
  strTime?: string | null;
};

const asScore=(value:unknown):number|null=>{
  if(typeof value==="number"&&Number.isFinite(value))return value;
  if(typeof value==="string"&&value.trim()!==""&&Number.isFinite(Number(value)))return Number(value);
  return null;
};

export async function fallbackFinalScore(home:string,away:string,date:number):Promise<{home:number;away:number;source:"TheSportsDB"}|null>{
  if(!home||!away||!Number.isFinite(date))return null;
  const day=new Date(date).toISOString().slice(0,10);
  const eventName=`${home}_vs_${away}`;
  const url=new URL("https://www.thesportsdb.com/api/v1/json/123/searchevents.php");
  url.searchParams.set("e",eventName);
  url.searchParams.set("d",day);
  try{
    const response=await fetch(url.toString(),{headers:{Accept:"application/json"},signal:AbortSignal.timeout(6000),cf:{cacheTtl:21600,cacheEverything:true}});
    if(!response.ok)return null;
    const data=await response.json() as {event?:SportsDbEvent[]|null;events?:SportsDbEvent[]|null};
    const events=data.event??data.events??[];
    const candidates=events.filter(item=>teamKey(item.strHomeTeam??"")===teamKey(home)&&teamKey(item.strAwayTeam??"")===teamKey(away)&&item.dateEvent===day);
    // Never select an arbitrary result from an ambiguous same-day pairing.
    if(candidates.length!==1)return null;
    const match=candidates[0];
    if(!match)return null;
    const homeScore=asScore(match.intHomeScore),awayScore=asScore(match.intAwayScore);
    if(homeScore===null||awayScore===null||!Number.isInteger(homeScore)||!Number.isInteger(awayScore)||homeScore<0||awayScore<0)return null;
    // A final score must not be inferred from a live or scheduled event.
    const finalStatuses=new Set(["match finished","finished","ft","full time","after extra time","aet","after penalties","pen"]);
    if(!finalStatuses.has((match.strStatus??"").trim().toLowerCase()))return null;
    return {home:homeScore,away:awayScore,source:"TheSportsDB"};
  }catch{return null;}
}
