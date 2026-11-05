import { getBroadcastRegistryAsync } from "../../../lib/broadcast/registry";
import { broadcastMatchesFixture, splitBroadcastTeams } from "../../../lib/broadcast/match-fixture";
import { NextRequest } from "next/server";
import { GET as independentFixtures } from "../match-centre/fixtures/route";
import { recordHealth } from "../../service-health";
function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

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
  category?: string;
  category_name?: string;
  poster?: string;
  uri_name?: string;
  locale?: string;
  source_tag?: string;
  starts_at?: number;
  ends_at?: number;
  always_live?: number | boolean;
  substreams?: Array<{id?:string|number;iframe?:string;embed_url?:string;source_tag?:string;tag?:string;language?:string;locale?:string;hd?:boolean}>;
};
// Match discovery only uses the operator-approved KV/secret catalogue.
// Do not make unapproved third-party network requests from production Workers.
async function getPpvEvents():Promise<PpvEvent[]>{
  return getBroadcastRegistryAsync();
}
const MATCH_KICKOFF_TOLERANCE_MS = 90 * 60_000;
function hasDirectEmbed(event:PpvEvent){
  const valid=(value:string|undefined)=>{try{const url=new URL(value??"");return url.protocol==="https:"&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false;}};
  return valid(event.iframe)||Boolean(event.substreams?.some(source=>valid(source.iframe||source.embed_url)));
}
function findPpvEvent(match:{home:string;away:string;date:number},events:PpvEvent[]){
  const candidates=events.filter(event=>event.id!=null&&hasDirectEmbed(event)&&broadcastMatchesFixture(event,match,MATCH_KICKOFF_TOLERANCE_MS));
  return candidates.sort((a,b)=>Math.abs((a.starts_at??0)*1000-match.date)-Math.abs((b.starts_at??0)*1000-match.date))[0];
}
function ppvFootballMatches(events:PpvEvent[],now:number){
  return events.flatMap(event=>{
    const category=(event.category_name||event.category||"").trim().toLowerCase();
    if(!["football","soccer","association football"].includes(category))return [];
    const teams=splitBroadcastTeams(event.name||event.title||"");
    const starts=Number(event.starts_at??0),ends=Number(event.ends_at??(starts>0?starts+3*60*60:0));
    if(!teams||!Number.isFinite(starts)||starts<=0||!Number.isFinite(ends)||ends<=0)return [];
    const startMs=starts*1000,endMs=ends*1000;
    if(endMs<now-15*60_000||startMs>now+7*24*60*60_000)return [];
    if(event.id==null||!hasDirectEmbed(event))return [];
    // PPV catalogue timestamps indicate an event window, not verified play status.
    const live=false;
    const matchStatus=now>=endMs?"FT":"NS";
    return [{
      id:"ppv-"+String(event.id),sport:"football",league:event.category_name||event.category||"Football",
      home:teams.home,away:teams.away,
      homeCode:teams.home.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),
      awayCode:teams.away.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),
      date:startMs,time:new Date(startMs).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}),
      live,matchStatus,popular:false,colorA:"#303a48",colorB:"#202b39",
      apiSources:[{source:"ppv",id:String(event.id)}],broadcastProvider:"Ninety",
      venueImage:"/stadiums/Default.jpg",venuePosition:"center"
    }];
  }).sort((a,b)=>(Number(b.live)-Number(a.live))||(a.date-b.date));
}
async function fixtureFallback(reason:string, request:Request){
  try {
    const nowDate=new Date();
    const dates=Array.from({length:5},(_,i)=>{
      const day=new Date(nowDate.getTime()+(i-1)*86400000);
      return day.toISOString().slice(0,10);
    });
    const [fixtureResults,ppvResult]=await Promise.all([
      Promise.allSettled(dates.map(async day=>{
        const url=new URL("/api/match-centre/fixtures",request.url);
        url.searchParams.set("date",day);
        const response=await independentFixtures(new NextRequest(url));
        if(!response.ok)throw new Error("fixtures-"+day+"-"+response.status);
        return await response.json() as {fixtures?:Array<{id:string;home:string;away:string;league:string;homeBadge:string|null;awayBadge:string|null;kickoff:string|null;status:string|null}>;sources?:unknown};
      })),
      getPpvEvents().then(events=>({events,error:null as string|null})).catch(error=>({events:[] as PpvEvent[],error:error instanceof Error?error.message:"unknown"}))
    ]);
    const successful=fixtureResults.filter((r):r is PromiseFulfilledResult<{fixtures?:Array<{id:string;home:string;away:string;league:string;homeBadge:string|null;awayBadge:string|null;kickoff:string|null;status:string|null}>;sources?:unknown}>=>r.status==="fulfilled");
    const payload={fixtures:successful.flatMap(r=>r.value.fixtures??[]),sources:successful.map(r=>r.value.sources).filter(Boolean)};
    const fixtureStatus=successful.length?200:503;
    const now=Date.now();
    const ppvOnly=ppvFootballMatches(ppvResult.events,now);
    const fixtures=(payload?.fixtures??[]).filter(f=>f.kickoff&&Number.isFinite(Date.parse(f.kickoff)));
    if(!fixtures.length&&ppvOnly.length){
      console.warn("[ninety:matches] approved standalone catalogue active",JSON.stringify({count:ppvOnly.length,fixtureStatus}));
      return Response.json({matches:ppvOnly,sports:[{id:"football",name:"Football"}],degraded:true,
        message:"Fixture provider unavailable; showing available scheduled events.",
        broadcastProvider:"Ninety",broadcastMatches:ppvOnly.length,
        sources:{fixtures:successful.length?"empty":"unavailable",broadcasts:"catalogue"}}
      ,{headers:{"Cache-Control":"no-store"}});
    }
    if(!fixtures.length)throw new Error("no-independent-fixtures-or-ppv-football-events");
    const activeStatuses=new Set(["1H","HT","2H","ET","BT","P","INT","LIVE"]);
    const finishedStatuses=new Set(["FT","AET","PEN","CANC","PST","ABD","AWD","WO"]);
    const prioritized=fixtures.sort((a,b)=>{
      const rank=(f:typeof fixtures[number])=>{
        const status=(f.status??"").toUpperCase();
        const kickoff=Date.parse(f.kickoff!);
        if(activeStatuses.has(status))return 0;
        if(!finishedStatuses.has(status)&&kickoff>=now-3*60*60_000&&kickoff<=now+6*60*60_000)return 1;
        if(!finishedStatuses.has(status)&&kickoff>now)return 2;
        return 3;
      };
      return rank(a)-rank(b)||Date.parse(a.kickoff!)-Date.parse(b.kickoff!);
    });
    // Keep the normal fixture cap for unlinked matches, but never discard a
    // broadcast-backed fixture solely because the fixture feed is crowded.
    const selected=prioritized.filter((f,i)=>{
      if(i<200&&(i<35||!finishedStatuses.has((f.status??"").toUpperCase())))return true;
      const kickoff=Date.parse(f.kickoff!);
      return Boolean(findPpvEvent({home:f.home,away:f.away,date:kickoff},ppvResult.events));
    });
    const matches=selected.map(f=>{
      const date=Date.parse(f.kickoff!);
      const ppv=findPpvEvent({home:f.home,away:f.away,date},ppvResult.events);
      return {id:"fixture-"+f.id,sport:"football",league:f.league||"Football",home:f.home,away:f.away,
        homeCode:f.home.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),awayCode:f.away.replace(/[^a-z]/gi,"").slice(0,3).toUpperCase(),
        date,time:new Date(date).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}),
        live:activeStatuses.has((f.status??"").toUpperCase()),matchStatus:f.status??undefined,
        popular:false,colorA:"#303a48",colorB:"#202b39",homeBadge:f.homeBadge??undefined,awayBadge:f.awayBadge??undefined,
        apiSources:ppv?[{source:"ppv",id:String(ppv.id)}]:[],broadcastProvider:ppv?"Ninety":undefined,
        venueImage:"/stadiums/Default.jpg",venuePosition:"center"};
    });
    if(!matches.length&&ppvOnly.length)return Response.json({matches:ppvOnly,sports:[{id:"football",name:"Football"}],degraded:true,message:"Fixture provider unavailable; showing available scheduled events.",broadcastProvider:"Ninety",broadcastMatches:ppvOnly.length},{headers:{"Cache-Control":"no-store"}});
    if(!matches.length)throw new Error("empty-independent-fixtures");
    const matched=matches.filter(match=>match.apiSources.length).length;
    // Include valid catalogue broadcasts even when the independent fixture feed
    // omits a match or uses a team alias that prevents exact matching.
    const linkedIds=new Set(matches.flatMap(match=>match.apiSources.map(source=>source.id)));
    // Match by team names and kickoff as well as provider ID. A fixture can
    // have a playable stream without the fixture-to-catalogue alias matching.
    const additional=ppvOnly.filter(match=>{
      if(linkedIds.has(match.apiSources[0]?.id??""))return false;
      const duplicate=matches.find(fixture=>{
        return broadcastMatchesFixture({name:match.home+" vs "+match.away,starts_at:match.date/1000},{home:fixture.home,away:fixture.away,date:fixture.date},MATCH_KICKOFF_TOLERANCE_MS);
      });
      if(duplicate){
        if(!duplicate.apiSources.length){
          duplicate.apiSources=[...match.apiSources];
          duplicate.broadcastProvider="Ninety";
        }
        return false;
      }
      return true;
    });
    const allMatches=[...matches,...additional];
    console.warn("[ninety:matches] independent fixtures active",JSON.stringify({reason,count:allMatches.length,ppvMatched:matched+additional.length,ppvError:ppvResult.error}));
    return Response.json({matches:allMatches,sports:[{id:"football",name:"Football"}],degraded:true,
      message:"Fixtures loaded; available broadcasts attached where matched.",sources:payload?.sources,
      broadcastProvider:"Ninety",broadcastMatches:matched+additional.length},
      {headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[ninety:matches] fixture fallback failed",JSON.stringify({reason,error:error instanceof Error?error.name:"unknown"}));
    return Response.json({error:"Match feeds temporarily unavailable."},{status:502,headers:{"Cache-Control":"no-store"}});
  }
}
export async function GET(request:Request){
  return fixtureFallback("primary-stream-catalogue-retired",request);
}
