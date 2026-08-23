import type { StreamListData, StreamPlaybackData } from "@/domain/stream/types";
async function read<T>(url: string, signal?: AbortSignal): Promise<T> { const response = await fetch(url, { signal, cache: "no-store" }); if (!response.ok) throw new Error(String(response.status)); return response.json() as Promise<T>; }
export const getStreams = (matchId: string, signal?: AbortSignal) => read<StreamListData>(`/api/football/match/${encodeURIComponent(matchId)}/streams`, signal);
export const resolveStream = (matchId: string, streamId: string, signal?: AbortSignal) => read<StreamPlaybackData>(`/api/football/match/${encodeURIComponent(matchId)}/streams/${encodeURIComponent(streamId)}`, signal);
