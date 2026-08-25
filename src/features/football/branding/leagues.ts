import { localCompetitionLogos } from "@/domain/football/competition-identity";

export interface LeagueBranding {
  logo: string;
  accent: string;
  surface: string;
}

export const leagueBranding = localCompetitionLogos;

export const leagueSlug = (name: string) => name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export function getLeagueBranding(slug: string): LeagueBranding | undefined { return leagueBranding[slug]; }
