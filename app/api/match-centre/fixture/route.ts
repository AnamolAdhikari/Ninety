import { NextRequest } from "next/server";
import { footballData, findFixture, type Fixture } from "../../../football-data";
import { normalizeApiFootballEvents, type ApiFootballEvent } from "../../../api-football-adapter";
type Timeline={strTimeline?:string;strTimelineDetail?:string;strTeam?:string;strPlayer?:string;strAssist?:string;intTime?:string};
type Player={strHome?:string;strSubstitute?:string;strPlayer?:string;strPosition?:string;intSquadNumber?:string};
type Event={idEvent?:string;strHomeTeam?:string;strAwayTeam?:string;strLeague?:string;strStatus?:string;strTimestamp?:string;intHomeScore?:string|null;intAwayScore?:string|null;strVenue?:string};
const root="https://www.thesportsdb.com/api/v1/json/123/";
const validTeam=(v:string|null)=>v&&v.length<=100?v:null;
async function footballFallback(home:string,away:string,kickoff:number){
 try{
  const fixtures=await footballData<Fixture>(`fixtures?date=${new Date(kickoff).toISOString().slice(0,10)}`,60);
  const fixture=findFixture(fixtures,home,away,kickoff);
  if(!fixture?.fixture?.id)return null;
  const [eventsResult,lineupsResult]=await Promise.allSettled([
   footballData<ApiFootballEvent>(`fixtures/events?fixture=${fixture.fixture.id}`,45),
   footballData<any>(`fixtures/lineups?fixture=${fixture.fixture.id}`,120)
  ]);
  const events=eventsResult.status==="fulfilled"?normalizeApiFootballEvents(eventsResult.value).map(e=>({minute:e.minute,type:e.type,team:e.team,player:e.player,detail:e.detail,assist:e.assist})):[];
  const teams=lineupsResult.status==="fulfilled"?lineupsResult.value:[];
  const mapSide=(name:string)=>{const side=teams.find((t:any)=>String(t.team?.name??"").toLowerCase()===name.toLowerCase());return {starters:(side?.startXI??[]).map((p:any)=>({name:p.player?.name??"",number:p.player?.number??null,position:p.player?.pos??null})).filter((p:any)=>p.name),substitutes:(side?.substitutes??[]).map((p:any)=>({name:p.player?.name??""})).filter((p:any)=>p.name)};};
  const homeLineup=mapSide(home),awayLineup=mapSide(away);
  return {status:"available",fixture:{id:String(fixture.fixture.id),home,away,league:null,matchStatus:fixture.fixture.status?.short??null,kickoff:fixture.fixture.date??null,venue:fixture.fixture.venue?.name??null,score:{home:fixture.goals?.home??null,away:fixture.goals?.away??null}},events,lineups:{home:homeLineup,away:awayLineup},availability:{events:events.length>0,lineups:homeLineup.starters.length>0||awayLineup.starters.length>0,commentary:false,statistics:false,standings:false,headToHead:false},source:"API-Football",checkedAt:Date.now()};
 }catch{return null;}
}

async function directApiFixture(id:string){
 try{
  const fixtures=await footballData<Fixture & {league?:{name?:string}}>(`fixtures?id=${id}`,35);
  const f=fixtures.find(x=>String(x.fixture?.id)===id);
  if(!f)return null;
  const [eventsResult,lineupsResult]=await Promise.allSettled([footballData<ApiFootballEvent>(`fixtures/events?fixture=${id}`,45),footballData<any>(`fixtures/lineups?fixture=${id}`,90)]);
  const events=eventsResult.status==="fulfilled"?normalizeApiFootballEvents(eventsResult.value).map(e=>({minute:e.minute,type:e.type,team:e.team,player:e.player,detail:e.detail,assist:e.assist})):[];
  const teams=lineupsResult.status==="fulfilled"?lineupsResult.value:[];
  const lineup=(name:string,teamId?:number)=>{const found=teams.find((x:any)=>teamId?x.team?.id===teamId:String(x.team?.name??"").toLowerCase()===name.toLowerCase());return {starters:(found?.startXI??[]).map((x:any)=>({name:x.player?.name??"",number:x.player?.number??null,position:x.player?.pos??null})).filter((x:any)=>x.name),substitutes:(found?.substitutes??[]).map((x:any)=>({name:x.player?.name??""})).filter((x:any)=>x.name)};};
  const home=f.teams?.home?.name??"Home",away=f.teams?.away?.name??"Away";
  const homeLineup=lineup(home,f.teams?.home?.id),awayLineup=lineup(away,f.teams?.away?.id);
  return {status:"available",fixture:{id,home,away,league:f.league?.name??null,matchStatus:f.fixture?.status?.short??null,kickoff:f.fixture?.date??null,venue:f.fixture?.venue?.name??null,score:{home:f.goals?.home??null,away:f.goals?.away??null}},events,lineups:{home:homeLineup,away:awayLineup},availability:{events:events.length>0,lineups:homeLineup.starters.length>0||awayLineup.starters.length>0,commentary:false,statistics:false,standings:false,headToHead:false},source:"API-Football",checkedAt:Date.now()};
 }catch{return null;}
}
async function get<T>(path:string){const r=await fetch(root+path,{signal:AbortSignal.timeout(7000),next:{revalidate:45}});if(!r.ok)throw new Error("Upstream unavailable");return r.json() as Promise<T>;}
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("id")??"";
 const provider=req.nextUrl.searchParams.get("provider");
 const home=validTeam(req.nextUrl.searchParams.get("home")),away=validTeam(req.nextUrl.searchParams.get("away"));
 const kickoff=Number(req.nextUrl.searchParams.get("kickoff"));
 const alternate=home&&away&&Number.isFinite(kickoff)&&Math.abs(Date.now()-kickoff)<8*86400000?footballFallback(home,away,kickoff):Promise.resolve(null);
 if(!/^\d{1,15}$/.test(id))return Response.json({error:"Invalid fixture ID"},{status:400});
 if(provider==="API-Football"){const direct=await directApiFixture(id);return direct?Response.json(direct,{headers:{"Cache-Control":"private, no-store"}}):Response.json({status:"unavailable",message:"API-Football could not verify this match"},{status:503,headers:{"Cache-Control":"no-store"}});}
 try{
  const [match,timeline,lineup]=await Promise.allSettled([
   get<{events?:Event[]|null}>("lookupevent.php?id="+id),
   get<{timeline?:Timeline[]|null}>("lookuptimeline.php?id="+id),
   get<{lineup?:Player[]|null}>("lookuplineup.php?id="+id)
  ]);
  if(match.status!=="fulfilled"||!match.value.events?.some(e=>e.idEvent===id)){const fallback=await alternate;return fallback?Response.json(fallback,{headers:{"Cache-Control":"private, no-store"}}):Response.json({status:"unavailable",message:"Fixture not verified by providers"},{status:404});}
  const event=match.value.events.find(e=>e.idEvent===id)!;
  const events=timeline.status==="fulfilled"?(timeline.value.timeline??[]).filter(e=>e.strTimeline).map(e=>({minute:Number.isFinite(Number(e.intTime))?Number(e.intTime):null,type:e.strTimeline,detail:e.strTimelineDetail??"",team:e.strTeam??"",player:e.strPlayer??"",assist:e.strAssist??""})).sort((a,b)=>(b.minute??-1)-(a.minute??-1)):[];
  const players=lineup.status==="fulfilled"?lineup.value.lineup??[]:[];
  const alternateData=(!events.length||!players.length||event.intHomeScore==null||event.intAwayScore==null)?await alternate:null;
  const side=(home:boolean)=>({starters:players.filter(p=>p.strHome===(home?"Yes":"No")&&p.strSubstitute==="No"&&p.strPlayer).map(p=>({name:p.strPlayer,number:p.intSquadNumber??null,position:p.strPosition??null})),substitutes:players.filter(p=>p.strHome===(home?"Yes":"No")&&p.strSubstitute==="Yes"&&p.strPlayer).map(p=>({name:p.strPlayer,number:p.intSquadNumber??null}))});
  return Response.json({status:"available",fixture:{id,home:event.strHomeTeam,away:event.strAwayTeam,league:event.strLeague,matchStatus:event.strStatus??null,kickoff:event.strTimestamp??null,venue:event.strVenue??null,score:{home:event.intHomeScore==null?null:Number(event.intHomeScore),away:event.intAwayScore==null?null:Number(event.intAwayScore)}},events:events.length?events:(alternateData?.events??[]),lineups:{home:players.length?side(true):(alternateData?.lineups.home??side(true)),away:players.length?side(false):(alternateData?.lineups.away??side(false))},availability:{events:events.length>0||!!alternateData?.events.length,lineups:players.length>0||!!alternateData?.availability.lineups,commentary:false,statistics:false,standings:false,headToHead:false},source:alternateData?"TheSportsDB + API-Football":"TheSportsDB",checkedAt:Date.now()},{headers:{"Cache-Control":"public, max-age=30, s-maxage=45"}});
 }catch{const fallback=await alternate;return fallback?Response.json(fallback,{headers:{"Cache-Control":"private, no-store"}}):Response.json({status:"unavailable",message:"Match providers temporarily unavailable"},{status:503});}
}
