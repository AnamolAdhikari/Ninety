import type { FootballDashboardData } from "@/domain/football/types";
export interface FootballProvider { getDashboard(): Promise<FootballDashboardData>; }
