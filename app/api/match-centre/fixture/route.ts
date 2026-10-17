import { NextRequest } from "next/server";
type Timeline={strTimeline?:string;strTimelineDetail?:string;strTeam?:string;strPlayer?:string;strAssist?:string;intTime?:string};
type Player={strHome?:string;strSubstitute?:string;strPlayer?:string;strPosition?:string;intSquadNumber?:string};
type Event={idEvent?:string;strHomeTeam?:string;strAwayTeam?:string;strLeague?:string;strStatus?:string;strTimestamp?:string;intHomeScore?:string|null;intAwayScore?:string|null;strVenue?:string};
const root="https://www.thesportsdb.com/api/v1/json/123/";
async function get<T>(path:string){const r=await fetch(root+path,{signal:AbortSignal.timeout(7000),next:{revalidate:45}});if(!r.ok)throw new Error("Upstream unavailable");return r.json() as Promise<T>;}
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get("id")??"";
 if(!/^\d{1,15}$/.test(id))return Response.json({error:"Invalid fixture ID"},{status:400});
 try{
  const [match,timeline,lineup]=await Promise.allSettled([
   get<{events?:Event[]|null}>("lookupevent.php?id="+id),
   get<{timeline?:Timeline[]|null}>("lookuptimeline.php?id="+id),
   get<{lineup?:Player[]|null}>("lookuplineup.php?id="+id)
  ]);
  if(match.status!=="fulfilled"||!match.value.events?.some(e=>e.idEvent===id))return Response.json({status:"unavailable",message:"Fixture not verified by provider"},{status:404});
  const event=match.value.events.find(e=>e.idEvent===id)!;
  const events=timeline.status==="fulfilled"?(timeline.value.timeline??[]).filter(e=>e.strTimeline).map(e=>({minute:Number.isFinite(Number(e.intTime))?Number(e.intTime):null,type:e.strTimeline,detail:e.strTimelineDetail??"",team:e.strTeam??"",player:e.strPlayer??"",assist:e.strAssist??""})).sort((a,b)=>(b.minute??-1)-(a.minute??-1)):[];
  const players=lineup.status==="fulfilled"?lineup.value.lineup??[]:[];
  const side=(home:boolean)=>({starters:players.filter(p=>p.strHome===(home?"Yes":"No")&&p.strSubstitute==="No"&&p.strPlayer).map(p=>({name:p.strPlayer,number:p.intSquadNumber??null,position:p.strPosition??null})),substitutes:players.filter(p=>p.strHome===(home?"Yes":"No")&&p.strSubstitute==="Yes"&&p.strPlayer).map(p=>({name:p.strPlayer,number:p.intSquadNumber??null}))});
  return Response.json({status:"available",fixture:{id,home:event.strHomeTeam,away:event.strAwayTeam,league:event.strLeague,matchStatus:event.strStatus??null,kickoff:event.strTimestamp??null,venue:event.strVenue??null,score:{home:event.intHomeScore==null?null:Number(event.intHomeScore),away:event.intAwayScore==null?null:Number(event.intAwayScore)}},events,lineups:{home:side(true),away:side(false)},availability:{events:timeline.status==="fulfilled"&&events.length>0,lineups:lineup.status==="fulfilled"&&players.length>0,commentary:false,statistics:false,standings:false,headToHead:false},source:"TheSportsDB",checkedAt:Date.now()},{headers:{"Cache-Control":"public, max-age=30, s-maxage=45"}});
 }catch{return Response.json({status:"unavailable",message:"Match provider temporarily unavailable"},{status:503});}
}
