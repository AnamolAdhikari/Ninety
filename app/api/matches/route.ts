import { NextRequest } from "next/server";
import { GET as independentFixtures } from "../match-centre/fixtures/route";
import { recordHealth } from "../../service-health";
const API = "https://streamed.pk";
type RawMatch = { id?:unknown; title?:unknown; category?:unknown; date?:unknown; popular?:unknown; teams?:{home?:{name?:unknown;badge?:unknown};away?:{name?:unknown;badge?:unknown}}; sources?:Array<{source?:unknown;id?:unknown}> };
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;
const badge=(value:unknown)=>{const id=clean(value);return id?`${API}/api/images/badge/${encodeURIComponent(id)}.webp`:undefined;};

type PpvEvent = {
  id?: string | number;
  name?: string;
  title?: string;
  tag?: string;
  iframe?: string;
  starts_at?: number;
  ends_at?: number;
  always_live?: number;
  category?: string;
  category_name?: string;
  poster?: string;
  substreams?: Array<{iframe?:string;embed_url?:string;source_tag?:string;tag?:string;language?:string;hd?:boolean}>;
};
type PpvPayload = {streams?:Array<{category?:string;streams?:PpvEvent[]}>};
const PPV_API = "https://api.ppv.st/api/streams";
const normalizeName=(value:string)=>value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
async function getPpvEvents():Promise<PpvEvent[]>{
  const response=await fetch(PPV_API,{headers:{Accept:"application/json"},next:{revalidate:60},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw new Error("ppv-http-"+response.status);
  const type=response.headers.get("content-type")?.toLowerCase()??"";
  if(!type.includes("application/json"))throw new Error("ppv-non-json");
  const payload=await response.json() as PpvPayload;
  if(!Array.isArray(payload.streams))throw new Error("ppv-invalid-catalog");
  return payload.streams.flatMap(group=>(Array.isArray(group.streams)?group.streams:[]).map(event=>({...event,category_name:event.category_name||group.category||"Sports"})));
}
const aliases:Record<string,string[]> = {
  "manchester united":["man utd","manutd","man united"],
  "manchester city":["man city","mancity"],
  "brighton and hove albion":["brighton"],
  "tottenham hotspur":["tottenham","spurs"],
  "paris saint germain":["psg"],
  "atletico madrid":["atletico"],
  "inter milan":["inter"],
  "ac milan":["milan"],
  "borussia dortmund":["dortmund"],
  "bayern munich":["bayern"],
};
function teamAppears(eventName:string,team:string){
  const event=normalizeName(eventName),key=normalizeName(team);
  if(key.length>=4&&event.includes(key))return true;
  const alias=aliases[key]??[];
  return alias.some(value=>event.includes(normalizeName(value)));
}
function hasDirectEmbed(event:PpvEvent){
  const valid=(value:string|undefined)=>{try{const url=new URL(value??"");return url.protocol==="https:"&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false;}};
  return valid(event.iframe)||Boolean(event.substreams?.some(source=>valid(source.iframe||source.embed_url)));
}
function findPpvEvent(match:{home:string;away:string;date:number},events:PpvEvent[]){
  const candidates=events.filter(event=>{
    const name=event.name||event.title||"";
    if(event.id==null||!name||!teamAppears(name,match.home)||!teamAppears(name,match.away)||!hasDirectEmbed(event))return false;
    if(typeof event.starts_at==="number"&&event.starts_at>0){
      const delta=Math.abs(event.starts_at*1000-match.date);
      if(delta>6*60*60*1000)return false;
    }
    return true;
  });
  return candidates.sort((a,b)=>Math.abs((a.starts_at??0)*1000-match.date)-Math.abs((b.starts_at??0)*1000-match.date))[0];
}
async function fixtureFallback(reason:string, request:Request){
  try {
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/Chicago",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
    const part=(type:string)=>parts.find(p=>p.type===type)?.value??"";
    const day=`${part("year")}-${part("month")}-${part("day")}`;
    const url=new URL("/api/match-centre/fixtures",request.url);
    url.searchParams.set("date",day);
    const [result,ppvResult]=await Promise.all([
      independentFixtures(new NextRequest(url)),
      getPpvEvents().then(events=>({events,error:null as string|null})).catch(error=>({events:[] as PpvEvent[],error:error instanceof Error?error.message:"unknown"}))
    ]);
    if(!result.ok)throw new Error("fixture-provider-"+result.status);
    const payload=await result.json() as {fixtures?:Array<{id:string;home:string;away:string;league:string;homeBadge:string|null;awayBadge:string|null;kickoff:string|null;status:string|null}>;sources?:unknown};
    const now=Date.now();
    const fixtures=(payload.fixtures??[]).filter(f=>f.kickoff&&Number.isFinite(Date.parse(f.kickoff)));
    const matches=fixtures.sort((a,b)=>Math.abs(Date.parse(a.kickoff!)-now)-Math.abs(Date.parse(b.kickoff!)-now)).slice(0,80).map(f=>{
      const date=Date.parse(f.kickoff!);
      const ppv=findPpvEvent({home:f.home,away:f.away,date},ppvResult.events);
      return {id:"fixture-"+f.id,sport:"football",league:f.league||"Football",home:f.home,away:f.away,
        homeCode:f.home.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),awayCode:f.away.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),
        date,time:new Date(date).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}),
        live:["1H","HT","2H","ET","BT","P","INT","LIVE"].includes((f.status??"").toUpperCase()),
        popular:false,colorA:"#303a48",colorB:"#202b39",homeBadge:f.homeBadge??undefined,awayBadge:f.awayBadge??undefined,
        apiSources:ppv?[{source:"ppv",id:String(ppv.id)}]:[],broadcastProvider:ppv?"PPV.ST":undefined,
        venueImage:"/stadiums/Default.jpg",venuePosition:"center"};
    });
    if(!matches.length)throw new Error("empty-independent-fixtures");
    const matched=matches.filter(match=>match.apiSources.length).length;
    console.warn("[ninety:matches] independent fixtures active",JSON.stringify({reason,count:matches.length,ppvMatched:matched,ppvError:ppvResult.error}));
    return Response.json({matches,sports:[{id:"football",name:"Football"}],degraded:true,
      message:"Independent fixtures active; PPV.ST iframe sources are attached where available.",sources:payload.sources,
      broadcastProvider:"PPV.ST",broadcastMatches:matched},
      {headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ninety:matches] fixture fallback failed",JSON.stringify({reason,error:error instanceof Error?error.name:"unknown"}));
    return Response.json({error:"Match feeds temporarily unavailable."},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
export async function GET(request:Request){
  return fixtureFallback("primary-stream-catalogue-retired",request);
}
