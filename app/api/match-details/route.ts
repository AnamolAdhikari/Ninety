import { footballData, footballDataWithMeta, findFixture, FootballDataError, type Fixture } from "../../football-data";
import { sportsDbEvents } from "../../sportsdb-match-fallback";
import { fallbackFinalScore } from "../../score-fallback";
import { apiFootballMatchSnapshot, normalizeApiFootballEvents, type ApiFootballEvent } from "../../api-football-adapter";
export async function GET(request:Request){
  const url=new URL(request.url),home=url.searchParams.get('home')?.trim()??'',away=url.searchParams.get('away')?.trim()??'',date=Number(url.searchParams.get('date'));
  if(!home||!away||home.length>100||away.length>100||!Number.isFinite(date)||Math.abs(Date.now()-date)>7*86400000)return Response.json({error:'Invalid match'},{status:400});
  const fallbackEvents=async()=>{
    const secondary=await sportsDbEvents(home,away,date);
    return secondary?.length ? Response.json({status:"available",events:secondary,source:"TheSportsDB",checkedAt:Date.now(),freshness:"fresh",matchStatus:null,finalScore:null},{headers:{"Cache-Control":"private, no-store"}}) : null;
  };
  try{
    const secondaryPromise=fallbackEvents();
    const fixtures=await footballData<Fixture>(`fixtures?date=${new Date(date).toISOString().slice(0,10)}`),fixture=findFixture(fixtures,home,away,date);
    if(!fixture?.fixture?.id)return await secondaryPromise??Response.json({status:'unavailable',message:'No verified event provider currently covers this fixture.'});
    const finished=new Set(['FT','AET','PEN','CANC','ABD','AWD','WO']).has(fixture.fixture.status?.short??'');
    const result=await footballDataWithMeta<ApiFootballEvent>(`fixtures/events?fixture=${fixture.fixture.id}`,finished?21600:60);
    const events=normalizeApiFootballEvents(result.response);
    if(!events.length){const secondary=await secondaryPromise;if(secondary)return secondary;}
    const snapshot=apiFootballMatchSnapshot(fixture,result.response,{provider:'API-Football',checkedAt:result.checkedAt,freshness:result.freshness});
    let finalScore={home:fixture.goals?.home??fixture.score?.fulltime?.home??null,away:fixture.goals?.away??fixture.score?.fulltime?.away??null,source:'API-Football'};
    if(finished&&(finalScore.home==null||finalScore.away==null)){
      const fallback=await fallbackFinalScore(home,away,date);
      if(fallback)finalScore=fallback;
    }
    return Response.json({status:'available',checkedAt:result.checkedAt,freshness:result.freshness,source:'API-Football',events,matchStatus:fixture.fixture.status?.short??null,finalScore,snapshot},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    const secondary=await fallbackEvents();
    if(secondary)return secondary;
    const fallback=await fallbackFinalScore(home,away,date);
    if(fallback)return Response.json({status:'available',events:[],finalScore:fallback,message:error instanceof FootballDataError?error.message:undefined},{headers:{'Cache-Control':'private, no-store'}});
    return Response.json({status:'unavailable',message:error instanceof FootballDataError?'Match events are not currently available from the connected providers.':'Match events are temporarily unavailable.'});
  }
}
