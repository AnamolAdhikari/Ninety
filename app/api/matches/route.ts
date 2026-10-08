import { recordHealth } from "../../service-health";
const API = "https://streamed.pk";
type RawMatch = { id?:unknown; title?:unknown; category?:unknown; date?:unknown; popular?:unknown; teams?:{home?:{name?:unknown;badge?:unknown};away?:{name?:unknown;badge?:unknown}}; sources?:Array<{source?:unknown;id?:unknown}> };
const clean=(value:unknown,fallback="")=>typeof value==="string"?value:fallback;
const badge=(value:unknown)=>{const id=clean(value);return id?`${API}/api/images/badge/${encodeURIComponent(id)}.webp`:undefined;};

export async function GET(){
  try{
    const [matchesResponse,liveResponse]=await Promise.all([
      fetch(`${API}/api/matches/football`,{headers:{Accept:"application/json"},next:{revalidate:60}}),
      fetch(`${API}/api/matches/live`,{headers:{Accept:"application/json"},cache:"no-store"}).catch(()=>null)
    ]);
    if(!matchesResponse.ok)throw new Error(`matches ${matchesResponse.status}`);
    const raw=await matchesResponse.json() as RawMatch[], now=Date.now();
    const liveRaw=liveResponse?.ok?await liveResponse.json() as RawMatch[]:[];
    const liveById=new Map(liveRaw.map(item=>[clean(item.id),item]).filter(([id])=>Boolean(id)));
    let matches=raw.slice(0,80).map((match,index)=>{
      const title=clean(match.title,"Live event"), [titleHome,titleAway]=title.split(/\s+vs\.?\s+/i);
      const home=clean(match.teams?.home?.name,titleHome||title), away=clean(match.teams?.away?.name,titleAway||"Event");
      const date=typeof match.date==="number"?match.date:Number(match.date)||now;
      const id=clean(match.id,`event-${index}`);
      const liveMatch=liveById.get(id);
      const preferredSources=Array.isArray(liveMatch?.sources)&&liveMatch!.sources!.length?liveMatch!.sources:match.sources;
      return {id,sport:clean(match.category,"Sports"),league:clean(match.category,"Sports"),home,away,
        homeCode:home.replace(/[^a-zA-Z]/g,"").slice(0,3).toUpperCase(),awayCode:away.replace(/[^a-zA-Z]/g,"").slice(0,3).toUpperCase(),
        date,time:new Date(date).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Chicago"}),
        live:Boolean(liveMatch)||(date<=now&&date>=now-4*60*60_000),popular:Boolean(match.popular),colorA:"#303a48",colorB:"#202b39",
        homeBadge:badge(match.teams?.home?.badge),awayBadge:badge(match.teams?.away?.badge),
        apiSources:Array.isArray(preferredSources)?preferredSources.map(s=>({source:clean(s.source),id:clean(s.id)})).filter(s=>s.source&&s.id).slice(0,12):[]};
    }).sort((a,b)=>Number(b.live)-Number(a.live)||a.date-b.date);
    // Curated stadium artwork is intentionally independent from the football-data
    // provider so venue-plan/quota limits cannot block the featured hero.
    const stadiums: Record<string,{venueName:string;venueCity:string;venueImage:string;venuePosition?:string}> = {
      "barcelona": {
        venueName: "Spotify Camp Nou",
        venueCity: "Barcelona",
        venueImage: "/stadiums/fc-barcelona-camp-3840x2160-19432.jpeg",
      },
      "real madrid": {
        venueName: "Santiago Bernabéu",
        venueCity: "Madrid",
        venueImage: "/stadiums/wp13800810-santiago-bernabeu-stadium-pc-wallpapers.jpg",
        venuePosition: "center 72%",
      },
      "liverpool": {
        venueName: "Anfield",
        venueCity: "Liverpool",
        venueImage: "/stadiums/Anfield.jpg",
      },
      "manchester city": {
        venueName: "Etihad Stadium",
        venueCity: "Manchester",
        venueImage: "/stadiums/ManCity.jpg",
      },
      "arsenal": {
        venueName: "Emirates Stadium",
        venueCity: "London",
        venueImage: "/stadiums/Arsenal.jpg",
      },
      "manchester united": {
        venueName: "Old Trafford",
        venueCity: "Manchester",
        venueImage: "/stadiums/Old%20Trafford.webp",
      },
      "chelsea": {
        venueName: "Stamford Bridge",
        venueCity: "London",
        venueImage: "/stadiums/Chealsea.jpg",
      },
      "tottenham": {
        venueName: "Tottenham Hotspur Stadium",
        venueCity: "London",
        venueImage: "/stadiums/Tottenham.jpg",
      },
      "tottenham hotspur": {
        venueName: "Tottenham Hotspur Stadium",
        venueCity: "London",
        venueImage: "/stadiums/Tottenham.jpg",
      },
      "bayern munich": {
        venueName: "Allianz Arena",
        venueCity: "Munich",
        venueImage: "/stadiums/Bayern.jpg",
      },
      "borussia dortmund": {
        venueName: "Signal Iduna Park",
        venueCity: "Dortmund",
        venueImage: "/stadiums/Dortmund.webp",
      },
      "paris saint-germain": {
        venueName: "Parc des Princes",
        venueCity: "Paris",
        venueImage: "/stadiums/PSG.jpg",
      },
      "psg": {
        venueName: "Parc des Princes",
        venueCity: "Paris",
        venueImage: "/stadiums/PSG.jpg",
      },
      "juventus": {
        venueName: "Allianz Stadium",
        venueCity: "Turin",
        venueImage: "/stadiums/Juventus.jpg",
      },
      "inter milan": {
        venueName: "San Siro",
        venueCity: "Milan",
        venueImage: "/stadiums/Inter-Milan.jpg",
      },
      "inter": {
        venueName: "San Siro",
        venueCity: "Milan",
        venueImage: "/stadiums/Inter-Milan.jpg",
      },
      "atletico madrid": {
        venueName: "Metropolitano",
        venueCity: "Madrid",
        venueImage: "/stadiums/Atle%CC%81tico.jpg",
      },
    };
    matches = matches.map(match => {
      const stadium=stadiums[match.home.toLowerCase()];
      return stadium?{...match,...stadium}:match;
    });
    return Response.json({matches,sports:[{id:"football",name:"Football"}]},{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});
  }catch{await recordHealth("match-feed-error");return Response.json({error:"Live event feed is temporarily unavailable."},{status:502});}
}
