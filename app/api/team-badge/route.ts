type SportsDbTeam={strTeam?:string;strTeamAlternate?:string;strSport?:string;strGender?:string;strBadge?:string};

const aliases:Record<string,string>={
  "afc bournemouth":"Bournemouth",
  "athletic club":"Athletic Bilbao",
  "atletico madrid":"Atletico Madrid",
  "barcelona":"FC Barcelona",
  "celta vigo":"Celta Vigo",
  "deportivo la coruna":"Deportivo La Coruna",
  "inter":"Inter Milan",
  "milan":"AC Milan",
  "hammarby if":"Hammarby",
  "fc groningen":"Groningen",
  "as monaco":"Monaco",
  "paris saint germain":"Paris Saint-Germain",
  "lille":"Lille OSC",
  "necaxa":"Club Necaxa",
  "atlas":"Atlas FC",
  "atlante":"Atlante FC",
  "pumas unam":"UNAM Pumas",
  "tijuana":"Club Tijuana",
  "koln":"FC Cologne",
  "red bull new york":"New York Red Bulls",
  "seattle sounders":"Seattle Sounders FC",
  "san jose earthquakes":"San Jose Earthquakes",
  "nashville sc":"Nashville SC",
  "la galaxy":"Los Angeles Galaxy",
  "san diego fc":"San Diego FC",
  "portland timbers":"Portland Timbers",
  "colorado rapids":"Colorado Rapids",
  "sporting kansas city":"Sporting Kansas City",
  "st louis city sc":"St. Louis City SC",
  "turkiye":"Turkey",
  "united states":"USA",
};

function normalized(value:string){return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}
const clubWords=new Set(["fc","cf","afc","ac","sc","bk","ff","if","fk","sk","club","calcio"]);
function coreName(value:string){return normalized(value).split(" ").filter(word=>word&&!clubWords.has(word)).join(" ")}
function candidateNames(team:SportsDbTeam){return [team.strTeam??"",...(team.strTeamAlternate??"").split(",")].filter(Boolean)}
function matchScore(candidate:string,requested:string){const a=normalized(candidate),b=normalized(requested),ac=coreName(candidate),bc=coreName(requested);if(a===b)return 100;if(ac&&ac===bc)return 90;if(ac&&bc&&(ac.includes(bc)||bc.includes(ac)))return 70;const aw=new Set(ac.split(" ").filter(Boolean)),bw=new Set(bc.split(" ").filter(Boolean)),shared=[...aw].filter(word=>bw.has(word)).length,largest=Math.max(aw.size,bw.size);return largest?Math.round(shared/largest*50):0}
function bestTeam(teams:SportsDbTeam[],requested:string){return teams.map(team=>({team,score:Math.max(...candidateNames(team).map(name=>matchScore(name,requested)),0)})).sort((a,b)=>b.score-a.score)[0]?.score>=50?teams.map(team=>({team,score:Math.max(...candidateNames(team).map(name=>matchScore(name,requested)),0)})).sort((a,b)=>b.score-a.score)[0].team:undefined}

export async function GET(request:Request){
  const requested=new URL(request.url).searchParams.get("name")?.trim()??"";
  if(!requested||requested.length>80)return Response.json({badge:null},{status:400});
  const query=aliases[normalized(requested)]??requested;
  try{
    const response=await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`,{headers:{Accept:"application/json"},next:{revalidate:604800}});
    if(!response.ok)throw new Error(`badge ${response.status}`);
    const data=await response.json() as {teams?:SportsDbTeam[]|null};
    const teams=(data.teams??[]).filter(team=>team.strSport==="Soccer"&&team.strBadge);
    const team=bestTeam(teams,query);
    if(team?.strBadge)return Response.json({badge:team.strBadge},{headers:{"Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000"}});
    const fallbackResponse=query===requested?null:await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(requested)}`,{headers:{Accept:"application/json"},next:{revalidate:604800}});
    if(fallbackResponse?.ok){const fallbackData=await fallbackResponse.json() as {teams?:SportsDbTeam[]|null};const fallbackTeams=(fallbackData.teams??[]).filter(item=>item.strSport==="Soccer"&&item.strBadge),fallbackTeam=bestTeam(fallbackTeams,requested);if(fallbackTeam?.strBadge)return Response.json({badge:fallbackTeam.strBadge},{headers:{"Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000"}});}
    return Response.json({badge:null},{headers:{"Cache-Control":"public, max-age=3600, s-maxage=86400"}});
  }catch{return Response.json({badge:null},{headers:{"Cache-Control":"public, max-age=3600, s-maxage=86400"}})}
}
