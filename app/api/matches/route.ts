import { recordHealth } from "../../service-health";
import { footballData, findFixture, type Fixture } from "../../football-data";
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
    // Fetch fixture metadata for each calendar date represented in the feed so
    // upcoming featured matches can resolve their venue as well as today's games.
    // Keep this best-effort: stats-provider failures must never break the stream feed.
    let fixtures: Fixture[] = [];
    const fixtureDates = [...new Set(matches.map(match => new Date(match.date).toISOString().slice(0,10)))];
    const fixtureResults = await Promise.allSettled(
      fixtureDates.map(date => footballData<Fixture>(`fixtures?date=${date}`))
    );
    fixtures = fixtureResults.flatMap(result => result.status === "fulfilled" ? result.value : []);
    matches = matches.map(match => {
      const fixture = findFixture(fixtures, match.home, match.away, match.date);
      const venue = fixture?.fixture?.venue;
      const venueId = typeof venue?.id === "number" && Number.isInteger(venue.id) && venue.id > 0 ? venue.id : undefined;
      const sameTeams = fixtures.filter(item =>
        item.teams?.home?.name && item.teams?.away?.name &&
        item.teams.home.name.toLowerCase().includes(match.home.toLowerCase().split(" ")[0]) &&
        item.teams.away.name.toLowerCase().includes(match.away.toLowerCase().split(" ")[0])
      ).slice(0,3);
      return {
        ...match,
        matchStatus: fixture?.fixture?.status?.short,
        venueName: venue?.name ?? undefined,
        venueCity: venue?.city ?? undefined,
        venueImage: venueId ? `https://media.api-sports.io/football/venues/${venueId}.png` : undefined,
        ...(process.env.NODE_ENV !== "production" ? {} : {}),
        venueDebug: match.home.toLowerCase().includes("barcelona") && match.away.toLowerCase().includes("getafe") ? {
          requestedDate: new Date(match.date).toISOString(),
          fixtureDates,
          fixtureCount: fixtures.length,
          matched: Boolean(fixture),
          candidates: sameTeams.map(item => ({
            home: item.teams?.home?.name,
            away: item.teams?.away?.name,
            date: item.fixture?.date,
            venue: item.fixture?.venue,
          })),
        } : undefined,
      };
    });
    return Response.json({matches,sports:[{id:"football",name:"Football"}]},{headers:{"Cache-Control":"public, max-age=30, s-maxage=60"}});
  }catch{await recordHealth("match-feed-error");return Response.json({error:"Live event feed is temporarily unavailable."},{status:502});}
}
