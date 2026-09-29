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
  "koln":"FC Cologne",
  "red bull new york":"New York Red Bulls",
  "seattle sounders":"Seattle Sounders FC",
  "sporting kansas city":"Sporting Kansas City",
  "st louis city sc":"St. Louis City SC",
  "turkiye":"Turkey",
  "united states":"USA",
};

function normalized(value:string){return value.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim()}

export async function GET(request:Request){
  const requested=new URL(request.url).searchParams.get("name")?.trim()??"";
  if(!requested||requested.length>80)return Response.json({badge:null},{status:400});
  const query=aliases[normalized(requested)]??requested;
  try{
    const response=await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`,{headers:{Accept:"application/json"},next:{revalidate:604800}});
    if(!response.ok)throw new Error(`badge ${response.status}`);
    const data=await response.json() as {teams?:SportsDbTeam[]|null};
    const teams=(data.teams??[]).filter(team=>team.strSport==="Soccer"&&team.strBadge);
    const key=normalized(query),team=teams.find(item=>normalized(item.strTeam??"")===key||(item.strTeamAlternate??"").split(",").some(alias=>normalized(alias)===key))??teams[0];
    return Response.json({badge:team?.strBadge??null},{headers:{"Cache-Control":"public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000"}});
  }catch{return Response.json({badge:null},{headers:{"Cache-Control":"public, max-age=3600, s-maxage=86400"}})}
}
