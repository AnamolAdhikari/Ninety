import type { StreamOption } from "@/domain/stream/types";
export interface ProviderStream extends StreamOption { embedUrl: string; expiresAt?: string; }
export interface StreamProvider { getStreamsForMatch(matchId: string): Promise<ProviderStream[]>; }
