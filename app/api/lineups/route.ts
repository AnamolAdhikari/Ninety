type Player = { id?: number; name?: string; number?: number; pos?: string };
type TeamLineup = { team?: { id?: number; name?: string }; formation?: string; startXI?: Array<{ player?: Player }> };
type Fixture = { fixture?: { id?: number; date?: string }; teams?: { home?: { name?: string; id?: number }; away?: { name?: string; id?: number } } };
type ApiResult<T> = { response?: T[]; errors?: unknown };

const base = "https://v3.football.api-sports.io";
const normalize = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|cf|sc|afc|club|football|soccer|national|team)\b/g, "").replace(/[^a-z0-9]/g, "").replace(/united/g, "utd").replace(/city/g, "city");
const sameTeam = (a: string, b: string) => Boolean(a && b && (normalize(a) === normalize(b)));
const unavailable = (message: string) => Response.json({ status: "unavailable", message }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const home = url.searchParams.get("home")?.trim() ?? "";
  const away = url.searchParams.get("away")?.trim() ?? "";
  const date = Number(url.searchParams.get("date"));
  if (!home || !away || home.length > 100 || away.length > 100 || !Number.isFinite(date) || Math.abs(Date.now() - date) > 7 * 86400000) {
    return Response.json({ error: "Invalid match" }, { status: 400 });
  }
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) return unavailable("Confirmed lineups are not available for this match yet.");
  try {
    const headers = { "x-apisports-key": key };
    const matchDate = new Date(date).toISOString().slice(0, 10);
    const response = await fetch(`${base}/fixtures?date=${matchDate}`, { headers, next: { revalidate: 600 } });
    if (!response.ok) throw new Error("Fixture lookup failed");
    const fixtures = await response.json() as ApiResult<Fixture>;
    const matches = (fixtures.response ?? []).filter(item =>
      sameTeam(home, item.teams?.home?.name ?? "") && sameTeam(away, item.teams?.away?.name ?? "") &&
      Math.abs(Date.parse(item.fixture?.date ?? "") - date) <= 90 * 60000);
    if (matches.length !== 1 || !matches[0].fixture?.id) return unavailable("Confirmed lineups are not available for this match yet.");
    const fixture = matches[0];
    const lineupsResponse = await fetch(`${base}/fixtures/lineups?fixture=${fixture.fixture!.id}`, { headers, next: { revalidate: 600 } });
    if (!lineupsResponse.ok) throw new Error("Lineup lookup failed");
    const result = await lineupsResponse.json() as ApiResult<TeamLineup>;
    const getTeam = (id: number | undefined) => result.response?.find(item => id && item.team?.id === id);
    const homeData = getTeam(fixture.teams?.home?.id), awayData = getTeam(fixture.teams?.away?.id);
    const players = (team: TeamLineup | undefined) => team?.startXI?.map(entry => entry.player).filter((player): player is Player => Boolean(player?.name && typeof player.number === "number"));
    const homePlayers = players(homeData), awayPlayers = players(awayData);
    if (homePlayers?.length !== 11 || awayPlayers?.length !== 11) return unavailable("Starting XIs have not been confirmed by the lineup provider yet.");
    return Response.json({ status: "confirmed", source: "API-Football", home: { name: home, formation: homeData?.formation ?? null, players: homePlayers }, away: { name: away, formation: awayData?.formation ?? null, players: awayPlayers } }, { headers: { "Cache-Control": "public, max-age=180, s-maxage=600" } });
  } catch {
    return unavailable("Lineup information is temporarily unavailable. Check back closer to kick-off.");
  }
}
