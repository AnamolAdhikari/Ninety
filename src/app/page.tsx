import { FootballDashboard } from "@/features/football/components/football-dashboard";
import { getFootballService } from "@/server/services/football.service";
export const dynamic = "force-dynamic";
export default async function HomePage() { return <FootballDashboard data={await getFootballService().getDashboard()} />; }
