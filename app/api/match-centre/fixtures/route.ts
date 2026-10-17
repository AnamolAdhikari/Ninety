import { NextRequest } from "next/server";

/** Independent match-centre fixture discovery. Never reads broadcast fixtures or stream state. */
type SportsEvent = {
 idEvent?:string; strHomeTeam?:string;strAwayTeam?:string;dateEvent?:string;strTimestamp?:string;
 strHomeTeamBadge?:string|null;strAwayTeamBadge?:string|null;strTime?:string;strLeague?:string;strStatus?:string;intHomeScore?:string|null;intAwayScore?:string|null;strSport?:string;
};
const upstream="https://www.thesportsdb.com/api/v1/json/123/";
const safeBadge=(v:unknown)=>typeof v==="string"&&/^https:\/\/(?:www\.)?(?:thesportsdb\.com|r2\.thesportsdb\.com)\//i.test(v)?v:null;
const safeScore=(v:unknown)=>v===null||v===undefined||v===""?null:/^\d+$/.test(String(v))?Number(v):null;
export async function GET(request:NextRequest){
 const day=request.nextUrl.searchParams.get("date")??new Date().toISOString().slice(0,10);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||Math.abs(Date.parse(day)-Date.now())>8*86400000)return Response.json({error:"Invalid date"},{status:400});
 try{
  const response=await fetch(upstream+"eventsday.php?"+new URLSearchParams({d:day,s:"Soccer"}),{signal:AbortSignal.timeout(7000),next:{revalidate:60}});
  if(!response.ok)throw new Error("Provider unavailable");
  const body=await response.json() as {events?:SportsEvent[]|null};
  const fixtures=(body.events??[]).filter(e=>/^\d+$/.test(e.idEvent??"")&&e.strHomeTeam&&e.strAwayTeam&&(!e.strSport||e.strSport==="Soccer")).map(e=>({
   id:"sportsdb-"+e.idEvent,providerId:e.idEvent,home:e.strHomeTeam,away:e.strAwayTeam,league:e.strLeague??"Football",homeBadge:safeBadge(e.strHomeTeamBadge),awayBadge:safeBadge(e.strAwayTeamBadge),
   kickoff:e.strTimestamp??(e.dateEvent?e.dateEvent+"T"+(e.strTime??"00:00:00")+"Z":null),
   score:{home:safeScore(e.intHomeScore),away:safeScore(e.intAwayScore)},status:e.strStatus??null,
   source:"TheSportsDB"
  }));
  return Response.json({date:day,fixtures,checkedAt:Date.now(),source:"TheSportsDB",coverage:"Provider-reported fixtures only"},{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});
 }catch{return Response.json({status:"unavailable",fixtures:[],message:"Independent football fixture provider is unavailable."},{status:503,headers:{"Cache-Control":"no-store"}});}
}
