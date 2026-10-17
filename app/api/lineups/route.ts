import { sportsDbLineups } from "../../sportsdb-match-fallback";
import { footballData, footballDataWithMeta, findFixture, FootballDataError, type Fixture } from "../../football-data";

type Player = { id?: number; name?: string; photo?: string; number?: number | null; pos?: string };
type TeamLineup = { team?: { id?: number; name?: string; logo?: string }; formation?: string; startXI?: Array<{ player?: Player }>; substitutes?: Array<{player?:Player}>; coach?:{name?:string;photo?:string} };
const unavailable = (message: string) => Response.json({ status: "unavailable", message }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = url.searchParams.get("home")?.trim() ?? "";
  const away = url.searchParams.get("away")?.trim() ?? "";
  const date = Number(url.searchParams.get("date"));
  if (!home || !away || home.length > 100 || away.length > 100 || !Number.isFinite(date) || Math.abs(Date.now() - date) > 7 * 86400000) {
    return Response.json({ error: "Invalid match" }, { status: 400 });
  }
  const fallback = async (message: string) => {
    const secondary = await sportsDbLineups(home, away, date);
    return secondary ? Response.json(secondary, {headers:{"Cache-Control":"public, max-age=120"}}) : unavailable(message);
  };
  try {
    const secondaryPromise = sportsDbLineups(home, away, date);
    const fastFallback = async (message: string) => {
      const secondary = await secondaryPromise;
      return secondary ? Response.json(secondary, {headers:{"Cache-Control":"public, max-age=120"}}) : unavailable(message);
    };
    const matchDate = new Date(date).toISOString().slice(0, 10);
    const fixtures = await footballData<Fixture>(`fixtures?date=${matchDate}`);
    const fixture = findFixture(fixtures, home, away, date);
    if (!fixture?.fixture?.id) return fastFallback("No verified lineup source currently covers this fixture.");
    const result = await footballDataWithMeta<TeamLineup>(`fixtures/lineups?fixture=${fixture.fixture.id}`, 300);
    const getTeam = (id: number | undefined) => result.response?.find(item => id && item.team?.id === id);
    const homeData = getTeam(fixture.teams?.home?.id), awayData = getTeam(fixture.teams?.away?.id);
    const players = (team: TeamLineup | undefined) => team?.startXI?.map(entry => entry.player).filter((player): player is Player => Boolean(player?.name));
    const homePlayers = players(homeData), awayPlayers = players(awayData);
    if (!homePlayers?.length && !awayPlayers?.length) return fastFallback("Starting XIs have not been confirmed by the connected providers yet.");
    const portrait = (player: Player) => ({ ...player, photo: player.id && Number.isInteger(player.id) && player.id > 0 ? `https://media.api-sports.io/football/players/${player.id}.png` : undefined });
    const logo = (team: TeamLineup | undefined) => team?.team?.id && Number.isInteger(team.team.id) && team.team.id > 0 ? `https://media.api-sports.io/football/teams/${team.team.id}.png` : undefined;
    const side = (name:string, team:TeamLineup|undefined, starters:Player[]|undefined) => ({name,logo:logo(team),formation:team?.formation??null,confirmed:(starters?.length??0)===11,players:(starters??[]).map(portrait),substitutes:(team?.substitutes??[]).map(entry=>entry.player).filter((player):player is Player=>Boolean(player?.name)).map(portrait),coach:team?.coach?.name?team.coach:null});
    const complete=(homePlayers?.length??0)===11&&(awayPlayers?.length??0)===11;
    return Response.json({ status: complete ? "confirmed" : "partial", source: "API-Football", checkedAt:result.checkedAt, freshness:result.freshness, home: side(home,homeData,homePlayers), away: side(away,awayData,awayPlayers) }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });
  } catch (error) {
    return fallback(error instanceof FootballDataError ? "Lineups are not currently available from the connected providers." : "Lineup information is temporarily unavailable. Please try again later.");
  }
}
