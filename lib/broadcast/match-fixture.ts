// Match a broadcast to a fixture by both complete team names and kickoff time.
// Do not treat substrings (e.g. "Real Madrid" and "Real Madrid Castilla") as equal.
const aliases: Record<string, string[]> = {
  "manchester united": ["man utd", "manutd", "man united"],
  "manchester city": ["man city", "mancity"],
  "brighton and hove albion": ["brighton"],
  "tottenham hotspur": ["tottenham", "spurs"],
  "paris saint germain": ["psg"],
  "atletico madrid": ["atletico"],
  "inter milan": ["inter"],
  "ac milan": ["milan"],
  "borussia dortmund": ["dortmund"],
  "bayern munich": ["bayern"],
};
export type BroadcastFixture = { home: string; away: string; date: number };
export type BroadcastCandidate = { name?: string; title?: string; starts_at?: number; id?: string | number };

export function normalizeTeam(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
export function splitBroadcastTeams(name: string): { home: string; away: string } | null {
  const parts = name.trim().split(/\s+(?:vs?\.?|v|at|@)\s+/i);
  if (parts.length !== 2 || parts.some(part => part.trim().length < 2)) return null;
  return { home: parts[0].trim(), away: parts[1].trim() };
}
function sameTeam(a: string, b: string): boolean {
  const left = normalizeTeam(a), right = normalizeTeam(b);
  if (!left || !right) return false;
  if (left === right) return true;
  return [left, ...(aliases[left] ?? [])].some(name => normalizeTeam(name) === right)
    || [right, ...(aliases[right] ?? [])].some(name => normalizeTeam(name) === left);
}
export function broadcastMatchesFixture(event: BroadcastCandidate, fixture: BroadcastFixture, toleranceMs = 90 * 60_000): boolean {
  const teams = splitBroadcastTeams(event.name || event.title || "");
  if (!teams || !Number.isFinite(fixture.date) || !Number.isFinite(event.starts_at) || !event.starts_at || event.starts_at <= 0) return false;
  if (Math.abs(event.starts_at * 1000 - fixture.date) > toleranceMs) return false;
  return (sameTeam(teams.home, fixture.home) && sameTeam(teams.away, fixture.away))
    || (sameTeam(teams.home, fixture.away) && sameTeam(teams.away, fixture.home));
}
