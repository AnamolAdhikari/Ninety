import { afterEach, describe, expect, it, vi } from "vitest";
import { sportsDbEvents, sportsDbLineups } from "./sportsdb-match-fallback";

const kickoff=Date.parse("2026-10-17T18:00:00Z");
const fixture={idEvent:"987654",strHomeTeam:"Real Betis",strAwayTeam:"Barcelona",dateEvent:"2026-10-17",strTimestamp:"2026-10-17T18:00:00Z",strSport:"Soccer"};
const mock=(event:unknown,extra:Record<string,unknown>)=>vi.stubGlobal("fetch",vi.fn(async (url:string)=>{
  const name=new URL(url).pathname.split("/").pop()??"";
  return {ok:true,json:async()=>name==="searchevents.php"?{event}:(extra[name]??{})};
}));
afterEach(()=>vi.unstubAllGlobals());
describe("independent match data provider",()=>{
  it("maps timeline events from the exact fixture",async()=>{
    mock([fixture],{"lookuptimeline.php":{timeline:[{strTimeline:"Goal",intTime:"25",strTeam:"Barcelona",strPlayer:"Scorer",strAssist:"Assistant",strTimelineDetail:"Normal Goal"}]}});
    const result=await sportsDbEvents("Real Betis","Barcelona",kickoff);
    expect(result).toEqual([{minute:25,extra:null,team:"Barcelona",player:"Scorer",assist:"Assistant",type:"Goal",detail:"Normal Goal"}]);
  });
  it("rejects mismatched fixture dates",async()=>{
    mock([{...fixture,dateEvent:"2026-10-16"}],{"lookuptimeline.php":{timeline:[{strTimeline:"Goal"}]}});
    expect(await sportsDbEvents("Real Betis","Barcelona",kickoff)).toBeNull();
  });
  it("rejects ambiguous fixtures",async()=>{
    mock([fixture,fixture],{"lookuptimeline.php":{timeline:[{strTimeline:"Goal"}]}});
    expect(await sportsDbEvents("Real Betis","Barcelona",kickoff)).toBeNull();
  });
  it("returns partial verified lineups without inventing players",async()=>{
    mock([fixture],{"lookuplineup.php":{lineup:[{strHome:"Yes",strSubstitute:"No",strPlayer:"Starter",intSquadNumber:"9"},{strHome:"No",strSubstitute:"No",strPlayer:"Visitor"}]}});
    const result=await sportsDbLineups("Real Betis","Barcelona",kickoff);
    expect(result?.status).toBe("partial");
    expect(result?.home.players[0].name).toBe("Starter");
    expect(result?.away.players[0].name).toBe("Visitor");
  });
});
