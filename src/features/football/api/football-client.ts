import type { FootballDashboardData } from "@/domain/football/types";
export async function getFootballDashboard(signal?: AbortSignal): Promise<FootballDashboardData> { const response = await fetch("/api/football/dashboard", { signal }); if (!response.ok) throw new Error("Unable to load football data"); return response.json() as Promise<FootballDashboardData>; }
