import "server-only";
import { cache } from "react";
import { getFootballService } from "@/server/services/football.service";

export const getMatchCenterData = cache((matchId: string) => getFootballService().getMatchCenter(matchId));
