import "server-only";

const LIVE_AVAILABILITY_TTL_MS = 30_000;
type Entry = { playable: boolean; expiresAt: number };

export class StreamAvailabilityCache {
  private readonly entries = new Map<string, Entry>();
  constructor(private readonly clock: () => number = Date.now) {}
  set(matchId: string, playable: boolean) { this.entries.set(matchId, { playable, expiresAt: this.clock() + LIVE_AVAILABILITY_TTL_MS }); }
  get(matchId: string) {
    const entry = this.entries.get(matchId);
    if (!entry || entry.expiresAt <= this.clock()) { this.entries.delete(matchId); return undefined; }
    return entry.playable;
  }
}

export const streamAvailability = new StreamAvailabilityCache();
