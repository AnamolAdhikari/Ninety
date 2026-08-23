export const FAVORITES_KEY = "ninety.favorite.clubs";
export const RECENT_KEY = "ninety.recent.matches";
export interface RecentMatch { id: string; viewedAt: number; }
export function parseIds(value: string | null): string[] { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === "string"))].slice(0, 50) : []; } catch { return []; } }
export function toggleFavorite(current: string[], slug: string) { return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]; }
export function addRecent(current: RecentMatch[], id: string, now = Date.now()): RecentMatch[] { return [{ id, viewedAt: now }, ...current.filter((item) => item.id !== id)].slice(0, 8); }
export function parseRecent(value: string | null): RecentMatch[] { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is RecentMatch => item && typeof item.id === "string" && typeof item.viewedAt === "number").slice(0, 8) : []; } catch { return []; } }
