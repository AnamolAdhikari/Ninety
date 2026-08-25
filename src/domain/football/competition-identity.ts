import { deterministicInitials, visualIdentityKey } from "./visual-identity";

export interface CanonicalCompetition { name: string; slug: string; region: string; }

const identities: Record<string, CanonicalCompetition> = {};
const define = (identity: CanonicalCompetition, aliases: string[]) => aliases.forEach((alias) => { identities[visualIdentityKey(alias)] = identity; });

define({ name: "Premier League", slug: "premier-league", region: "England" }, ["Premier League", "PremierLeague", "English Premier League", "England Premier League", "EPL"]);
define({ name: "La Liga", slug: "la-liga", region: "Spain" }, ["La Liga", "LaLiga", "Primera Division"]);
define({ name: "Serie A", slug: "serie-a", region: "Italy" }, ["Serie A", "SerieA"]);
define({ name: "Bundesliga", slug: "bundesliga", region: "Germany" }, ["Bundesliga", "German Bundesliga"]);
define({ name: "Ligue 1", slug: "ligue-1", region: "France" }, ["Ligue 1", "Ligue1"]);
define({ name: "UEFA Champions League", slug: "champions-league", region: "Europe" }, ["UEFA Champions League", "Champions League", "UCL"]);
define({ name: "UEFA Europa League", slug: "europa-league", region: "Europe" }, ["UEFA Europa League", "Europa League", "UEL"]);
define({ name: "UEFA Conference League", slug: "conference-league", region: "Europe" }, ["UEFA Conference League", "Conference League"]);
define({ name: "MLS", slug: "mls", region: "United States" }, ["MLS", "Major League Soccer"]);
define({ name: "Saudi Pro League", slug: "saudi-pro-league", region: "Saudi Arabia" }, ["Saudi Pro League", "Saudi Professional League", "Rosahn Saudi League", "Roshn Saudi League"]);
define({ name: "Championship", slug: "championship", region: "England" }, ["Championship", "EFL Championship"]);
define({ name: "Copa Libertadores", slug: "copa-libertadores", region: "South America" }, ["Copa Libertadores", "Libertadores"]);
define({ name: "Brasileirão", slug: "brasileirao", region: "Brazil" }, ["Brasileirão", "Brasileirao", "Campeonato Brasileiro Série A", "Brazil Serie A"]);
define({ name: "Eredivisie", slug: "eredivisie", region: "Netherlands" }, ["Eredivisie"]);
define({ name: "Primeira Liga", slug: "primeira-liga", region: "Portugal" }, ["Primeira Liga", "Liga Portugal"]);

export const canonicalCompetition = (name: string, country?: string): CanonicalCompetition => identities[visualIdentityKey(name)] ?? { name: name.trim(), slug: visualIdentityKey(name), region: country?.trim() || "Worldwide" };

export const localCompetitionLogos: Readonly<Record<string, { logo: string; accent: string; surface: string }>> = {
  "premier-league": { logo: "/leagues/premier-league.svg", accent: "#c59bff", surface: "#2b143f" },
  "champions-league": { logo: "/leagues/uefa-champions-league.svg", accent: "#d9e3ff", surface: "#15213d" },
  bundesliga: { logo: "/leagues/bundesliga.svg", accent: "#ff6c74", surface: "#3b1116" },
  "la-liga": { logo: "/leagues/la-liga.svg", accent: "#ff6b63", surface: "#30171c" },
  "serie-a": { logo: "/leagues/serie-a.svg", accent: "#7cb7ff", surface: "#111f3c" },
};

export function resolveCompetitionVisualIdentity(competition: { slug?: string; name: string; region?: string; logoUrl?: string }) {
  const canonical = canonicalCompetition(competition.slug || competition.name, competition.region);
  const local = localCompetitionLogos[canonical.slug];
  return { name: canonical.name, slug: canonical.slug, region: canonical.region, localLogo: local?.logo, remoteLogo: competition.logoUrl, fallbackInitials: deterministicInitials(canonical.name), accent: local?.accent ?? "#c7ff4a", surface: local?.surface ?? "#15191f" };
}
