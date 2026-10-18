import { NextRequest } from "next/server";
import { footballData, type Fixture as ApiFixture } from "../../../football-data";
import { teamKey } from "../../../football-fixtures";

/** Football match discovery is independent of the broadcast feed. */
type SportsEvent={idEvent?:string;strHomeTeam?:string;strAwayTeam?:string;dateEvent?:string;strTimestamp?:string;strHomeTeamBadge?:string|null;strAwayTeamBadge?:string|null;strTime?:string;strLeague?:string;strStatus?:string;intHomeScore?:string|null;intAwayScore?:string|null;strSport?:string};
type Match={id:string;providerId:string;provider:"TheSportsDB"|"API-Football";home:string;away:string;league:string;homeBadge:string|null;awayBadge:string|null;kickoff:string|null;score:{home:number|null;away:number|null};status:string|null;source:string};
const root="https://www.thesportsdb.com/api/v1/json/123/";
const safeBadge=(v:unknown)=>typeof v==="string"&&/^https:\/\/(?:www\.)?(?:thesportsdb\.com|r2\.thesportsdb\.com|media\.api-sports\.io)\//i.test(v)?v:null;
const safeScore=(v:unknown)=>v===null||v===undefined||v===""?null:/^\d+$/.test(String(v))?Number(v):null;
const activeStatuses=new Set(["1H","HT","2H","ET","BT","P","INT","LIVE"]);
function live(status:string|null){return activeStatuses.has((status??"").toUpperCase())}
function identity(m:Match){const d=Date.parse(m.kickoff??"");return teamKey(m.home)+"/"+teamKey(m.away)+"/"+(Number.isFinite(d)?Math.round(d/5400000):"unknown")}
async function sportsdb(day:string):Promise<Match[]>{
 const response=await fetch(root+"eventsday.php?"+new URLSearchParams({d:day,s:"Soccer"}),{signal:AbortSignal.timeout(6500),next:{revalidate:45}});
 if(!response.ok)throw new Error("TheSportsDB unavailable");
 const body=await response.json() as {events?:SportsEvent[]|null};
 return (body.events??[]).filter(e=>/^\d+$/.test(e.idEvent??"")&&e.strHomeTeam&&e.strAwayTeam&&(!e.strSport||e.strSport==="Soccer")).map(e=>({
 id:"sportsdb-"+e.idEvent,providerId:e.idEvent!,provider:"TheSportsDB" as const,home:e.strHomeTeam!,away:e.strAwayTeam!,league:e.strLeague??"Football",homeBadge:safeBadge(e.strHomeTeamBadge),awayBadge:safeBadge(e.strAwayTeamBadge),
 kickoff:e.strTimestamp??(e.dateEvent?e.dateEvent+"T"+(e.strTime??"00:00:00")+"Z":null),score:{home:safeScore(e.intHomeScore),away:safeScore(e.intAwayScore)},status:e.strStatus??null,source:"TheSportsDB"
 }));
}
async function apiFootball(day:string):Promise<Match[]>{
 const fixtures=await footballData<ApiFixture & {league?:{name?:string};teams?:{home?:{name?:string;logo?:string};away?:{name?:string;logo?:string}}}>(`fixtures?date=${day}`,45);
 return fixtures.filter(f=>f.fixture?.id&&f.teams?.home?.name&&f.teams?.away?.name).map(f=>({
 id:"api-"+f.fixture!.id,providerId:String(f.fixture!.id),provider:"API-Football" as const,home:f.teams!.home!.name!,away:f.teams!.away!.name!,league:f.league?.name??"Football",
 homeBadge:safeBadge(f.teams?.home?.logo),awayBadge:safeBadge(f.teams?.away?.logo),kickoff:f.fixture?.date??null,score:{home:f.goals?.home??null,away:f.goals?.away??null},status:f.fixture?.status?.short??null,source:"API-Football"
 }));
}
export async function GET(request:NextRequest){
 const day=request.nextUrl.searchParams.get("date")??new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||Math.abs(Date.parse(day)-Date.now())>8*86400000)return Response.json({error:"Invalid date"},{status:400});
 const results=await Promise.allSettled([sportsdb(day),apiFootball(day)]);
 const found=results.flatMap(r=>r.status==="fulfilled"?r.value:[]);
 if(results.every(r=>r.status==="rejected"))return Response.json({status:"unavailable",fixtures:[],message:"Both independent football providers are unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});
 const byId=new Map<string,Match>();
 // Prefer API-Football's live state when both providers identify the same game.
 for(const match of found){
  const key=identity(match),previous=byId.get(key);
  if(!previous){byId.set(key,match);continue}
  const preferred=match.provider==="API-Football"?match:previous;
  const other=preferred===match?previous:match;
  byId.set(key,{...preferred,homeBadge:preferred.homeBadge??other.homeBadge,awayBadge:preferred.awayBadge??other.awayBadge,score:{home:preferred.score.home??other.score.home,away:preferred.score.away??other.score.away},status:preferred.status??other.status,source:preferred.source+" + "+other.source});
 }
 const fixtures=[...byId.values()].sort((a,b)=>Number(live(b.status))-Number(live(a.status))||(Date.parse(a.kickoff??"")||0)-(Date.parse(b.kickoff??"")||0));
 return Response.json({date:day,fixtures,checkedAt:Date.now(),sources:results.map((r,i)=>({provider:i===0?"TheSportsDB":"API-Football",available:r.status==="fulfilled",count:r.status==="fulfilled"?r.value.length:0})),coverage:"Provider-reported fixtures; live status only when explicitly supplied"},{headers:{"Cache-Control":"public, max-age=15, s-maxage=30"}});
}
