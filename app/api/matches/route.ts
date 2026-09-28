const API = "https://streamed.pk";
type RawMatch = { id?:unknown; title?:unknown; category?:unknown; date?:unknown; popular?:unknown; teams?:{home?:{name?:unknown;badge?:unknown};away?:{name?:unknown;badge?:unknown}}; sources?:Array<{source?:unknown;id?:unknown}> };
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;
const badge=(value:unknown)=>{const id=clean(value);return id?`${API}/api/images/badge/${encodeURIComponent(id)}.webp`:undefined;};

export async function GET(){
  try{
    const matchesResponse=await fetch(`${API}/api/matches/football`,{headers:{Accept:"application/json"},next:{revalidate:60}});
    if(!matchesResponse.ok)throw new Error(`matches ${matchesResponse.status}`);
    const raw=await matchesResponse.json() as RawMatch[], now=Date.now();
    const matches=raw.slice(0,80).map((match,index)=>{
      const title=clean(match.title,"Live event"), [titleHome,titleAway]=title.split(/\s+vs\.?\s+/i);
      const home=clean(match.teams?.home?.name,titleHome||title), away=clean(match.teams?.away?.name,titleAway||"Event");
      const date=typeof match.date==="number"?match.date:Number(match.date)||now;
      return {id:clean(match.id,`event-${index}`),sport:clean(match.category,"Sports"),league:clean(match.category,"Sports"),home,away,
        homeCode:home.replace(/[^a-zA-Z]/g,"").slice(0,3).toUpperCase(),awayCode:away.replace(/[^a-zA-Z]/g,"").slice(0,3).toUpperCase(),
        date,time:new Date(date).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}),
        live:date<=now+20*60_000&&date>=now-4*60*60_000,popular:Boolean(match.popular),colorA:"#303a48",colorB:"#202b39",
        homeBadge:badge(match.teams?.home?.badge),awayBadge:badge(match.teams?.away?.badge),
        apiSources:Array.isArray(match.sources)?match.sources.map(s=>({source:clean(s.source),id:clean(s.id)})).filter(s=>s.source&&s.id).slice(0,12):[]};
    }).sort((a,b)=>Number(b.live)-Number(a.live)||a.date-b.date);
    return Response.json({matches,sports:[{id:"football",name:"Football"}]},{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});
  }catch{return Response.json({error:"Live event feed is temporarily unavailable."},{status:502});}
}
