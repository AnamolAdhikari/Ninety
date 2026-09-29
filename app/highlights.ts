type Fixture = {home:string;away:string;date?:number};

/** A search, never an unverified video ID or a claim that highlights exist. */
export function highlightsSearchUrl(match:Fixture):string{
  const date=match.date?new Date(match.date).toLocaleDateString("en-US",{timeZone:"America/Chicago",year:"numeric",month:"long",day:"numeric"}):"";
  const query=[match.home,"vs",match.away,date,"official highlights"].filter(Boolean).join(" ");
  return "https://www.youtube.com/results?search_query="+encodeURIComponent(query);
}
