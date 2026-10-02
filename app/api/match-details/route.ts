import { footballData, footballDataWithMeta, findFixture, FootballDataError, type Fixture } from "../../football-data";
type Event={time?:{elapsed?:number;extra?:number|null};team?:{name?:string};player?:{name?:string};assist?:{name?:string};type?:string;detail?:string;comments?:string|null};
export async function GET(request:Request){
  const url=new URL(request.url),home=url.searchParams.get('home')?.trim()??'',away=url.searchParams.get('away')?.trim()??'',date=Number(url.searchParams.get('date'));
  if(!home||!away||home.length>100||away.length>100||!Number.isFinite(date)||Math.abs(Date.now()-date)>7*86400000)return Response.json({error:'Invalid match'},{status:400});
  try{
    const fixtures=await footballData<Fixture>(`fixtures?date=${new Date(date).toISOString().slice(0,10)}`),fixture=findFixture(fixtures,home,away,date);
    if(!fixture?.fixture?.id)return Response.json({status:'unavailable',message:'The connected provider does not cover this fixture.'});
    const finished=new Set(['FT','AET','PEN','CANC','ABD','AWD','WO']).has(fixture.fixture.status?.short??'');
    const result=await footballDataWithMeta<Event>(`fixtures/events?fixture=${fixture.fixture.id}`,finished?21600:60);
    const events=result.response.filter(item=>['Goal','Card','subst','Var'].includes(item.type??'')).slice(0,150).map(item=>({minute:item.time?.elapsed??null,extra:item.time?.extra??null,team:item.team?.name??'',player:item.player?.name??'',assist:item.assist?.name??'',type:item.type,detail:item.detail??''}));
    const finalScore={home:fixture.goals?.home??fixture.score?.fulltime?.home??null,away:fixture.goals?.away??fixture.score?.fulltime?.away??null};
    return Response.json({status:'available',checkedAt:result.checkedAt,source:'API-Football',events,matchStatus:fixture.fixture.status?.short??null,finalScore},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return Response.json({status:'unavailable',message:error instanceof FootballDataError?error.message:'Match events are temporarily unavailable.'});}
}
