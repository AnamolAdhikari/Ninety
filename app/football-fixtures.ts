export type Fixture = { fixture?: { id?: number; date?: string; status?: { short?: string } }; teams?: { home?: { name?: string; id?: number }; away?: { name?: string; id?: number } } };
const aliases: Record<string,string> = { czechia: "czechrepublic", turkey: "turkiye", southkorea: "korearepublic", utdstates: "usa", utdstatesofamerica: "usa" };
export function teamKey(name: string) {
  const key = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\b(fc|cf|sc|afc|club|football|soccer|national|team)\b/g, "").replace(/[^a-z0-9]/g, "").replace(/united/g, "utd");
  return aliases[key] ?? key;
}
export function findFixture(fixtures: Fixture[], home: string, away: string, date: number) {
  const found = fixtures.filter(item => teamKey(home) === teamKey(item.teams?.home?.name ?? "") && teamKey(away) === teamKey(item.teams?.away?.name ?? "") && Math.abs(Date.parse(item.fixture?.date ?? "") - date) <= 90 * 60000);
  return found.length === 1 ? found[0] : undefined;
}
