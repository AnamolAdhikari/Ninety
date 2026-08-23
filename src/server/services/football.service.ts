import "server-only";
import type { FootballDashboardData } from "@/domain/football/types";
import { MockFootballProvider } from "@/server/providers/football/mock-football.provider";
import type { FootballProvider } from "@/server/providers/football/provider";
export class FootballService { constructor(private readonly provider: FootballProvider) {} getDashboard(): Promise<FootballDashboardData> { return this.provider.getDashboard(); } }
export const footballService = new FootballService(new MockFootballProvider());
