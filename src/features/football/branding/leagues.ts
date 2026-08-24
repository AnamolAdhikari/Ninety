export interface LeagueBranding {
  logo: string;
  accent: string;
  surface: string;
}

export const leagueBranding = {
  "premier-league": { logo: "/leagues/premier-league.svg", accent: "#c59bff", surface: "#2b143f" },
  "champions-league": { logo: "/leagues/uefa-champions-league.svg", accent: "#d9e3ff", surface: "#15213d" },
  "uefa-champions-league": { logo: "/leagues/uefa-champions-league.svg", accent: "#d9e3ff", surface: "#15213d" },
  bundesliga: { logo: "/leagues/bundesliga.svg", accent: "#ff6c74", surface: "#3b1116" },
  "la-liga": { logo: "/leagues/la-liga.svg", accent: "#ff6b63", surface: "#30171c" },
  laliga: { logo: "/leagues/la-liga.svg", accent: "#ff6b63", surface: "#30171c" },
  "serie-a": { logo: "/leagues/serie-a.svg", accent: "#7cb7ff", surface: "#111f3c" },
} satisfies Record<string, LeagueBranding>;

export const leagueSlug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export function getLeagueBranding(slug: string): LeagueBranding | undefined { return leagueBranding[slug as keyof typeof leagueBranding]; }
