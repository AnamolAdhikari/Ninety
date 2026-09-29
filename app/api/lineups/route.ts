import { footballData, findFixture, FootballDataError, type Fixture } from "../../football-data";

type Player = { id?: number; name?: string; photo?: string; number?: number | null; pos?: string };
type TeamLineup = { team?: { id?: number; name?: string; logo?: string }; formation?: string; startXI?: Array<{ player?: Player }> };
const unavailable = (message: string) => Response.json({ status: "unavailable", message }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = url.searchParams.get("home")?.trim() ?? "";
  const away = url.searchParams.get("away")?.trim() ?? "";
  const date = Number(url.searchParams.get("date"));
  if (!home || !away || home.length > 100 || away.length > 100 || !Number.isFinite(date) || Math.abs(Date.now() - date) > 7 * 86400000) {
    return Response.json({ error: "Invalid match" }, { status: 400 });
  }
  try {
    const matchDate = new Date(date).toISOString().slice(0, 10);
    const fixtures = await footballData<Fixture>(`fixtures?date=${matchDate}`);
    const fixture = findFixture(fixtures, home, away, date);
    if (!fixture?.fixture?.id) return unavailable("No matching fixture was found in the connected provider's coverage for this match.");
    const result = { response: await footballData<TeamLineup>(`fixtures/lineups?fixture=${fixture.fixture.id}`, 1800) };
    const getTeam = (id: number | undefined) => result.response?.find(item => id && item.team?.id === id);
    const homeData = getTeam(fixture.teams?.home?.id), awayData = getTeam(fixture.teams?.away?.id);
    const players = (team: TeamLineup | undefined) => team?.startXI?.map(entry => entry.player).filter((player): player is Player => Boolean(player?.name));
    const homePlayers = players(homeData), awayPlayers = players(awayData);
    if (homePlayers?.length !== 11 || awayPlayers?.length !== 11) return unavailable("Starting XIs have not been confirmed by the lineup provider yet.");
    const portrait = (player: Player) => ({ ...player, photo: player.id && Number.isInteger(player.id) && player.id > 0 ? `https://media.api-sports.io/football/players/${player.id}.png` : undefined });
    const logo = (team: TeamLineup | undefined) => team?.team?.id && Number.isInteger(team.team.id) && team.team.id > 0 ? `https://media.api-sports.io/football/teams/${team.team.id}.png` : undefined;
    return Response.json({ status: "confirmed", source: "API-Football", home: { name: home, logo: logo(homeData), formation: homeData?.formation ?? null, players: homePlayers.map(portrait) }, away: { name: away, logo: logo(awayData), formation: awayData?.formation ?? null, players: awayPlayers.map(portrait) } }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });
  } catch (error) {
    return unavailable(error instanceof FootballDataError ? error.message : "Lineup information is temporarily unavailable. Please try again later.");
  }
}
