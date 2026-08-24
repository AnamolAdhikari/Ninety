import { StreamPlayer as ClientStreamPlayer } from "./stream-player";

export function StreamPlayer({ matchId }: { matchId: string }) {
  return <ClientStreamPlayer matchId={matchId} isolatedPlayerOrigin={process.env.NINETY_PLAYER_ORIGIN}/>;
}
