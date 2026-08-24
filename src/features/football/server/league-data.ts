import { cache } from "react";
import { getFootballService } from "@/server/services/football.service";

export const getLeaguePageData = cache((slug: string) => getFootballService().getLeague(slug));
