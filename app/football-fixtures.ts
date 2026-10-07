export type Fixture = { fixture?: { id?: number; date?: string; status?: { short?: string }; venue?: { id?: number|null; name?: string|null; city?: string|null } }; teams?: { home?: { name?: string; id?: number }; away?: { name?: string; id?: number } }; goals?: { home?: number|null; away?: number|null }; score?: { halftime?: { home?: number|null; away?: number|null }; fulltime?: { home?: number|null; away?: number|null }; extratime?: { home?: number|null; away?: number|null }; penalty?: { home?: number|null; away?: number|null } } };
const aliases: Record<string,string> = { czechia: "czechrepublic", turkey: "turkiye", southkorea: "korearepublic", utdstates: "usa", utdstatesofamerica: "usa" };
export function teamKey(name: string) {
  const key = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|cf|sc|afc|club|football|soccer|national|team)\b/g, "").replace(/[^a-z0-9]/g, "").replace(/united/g, "utd");
  return aliases[key] ?? key;
}
export function findFixture(fixtures: Fixture[], home: string, away: string, date: number) {
  const found = fixtures.filter(item => teamKey(home) === teamKey(item.teams?.home?.name ?? "") && teamKey(away) === teamKey(item.teams?.away?.name ?? "") && Math.abs(Date.parse(item.fixture?.date ?? "") - date) <= 90 * 60000);
  return found.length === 1 ? found[0] : undefined;
}
