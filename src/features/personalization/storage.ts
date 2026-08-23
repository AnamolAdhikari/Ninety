export const FAVORITES_KEY = "ninety.favorite.clubs";
export const RECENT_KEY = "ninety.recent.matches";
export interface RecentMatch { id: string; viewedAt: number; }
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const matchIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RECENT_MAX_AGE = 90 * 24 * 60 * 60 * 1000;
export function parseIds(value: string | null): string[] { if (!value) return []; try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === "string" && item.length <= 80 && slugPattern.test(item)))].slice(0, 50) : []; } catch { return []; } }
export function toggleFavorite(current: string[], slug: string) { if (!slugPattern.test(slug) || slug.length > 80) return current; return current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]; }
export function addRecent(current: RecentMatch[], id: string, now = Date.now()): RecentMatch[] { return [{ id, viewedAt: now }, ...current.filter((item) => item.id !== id)].slice(0, 8); }
export function parseRecent(value: string | null, now = Date.now()): RecentMatch[] { if (!value) return []; try { const parsed = JSON.parse(value); if (!Array.isArray(parsed)) return []; const unique = new Map<string, RecentMatch>(); parsed.filter((item): item is RecentMatch => item && typeof item.id === "string" && item.id.length <= 160 && matchIdPattern.test(item.id) && typeof item.viewedAt === "number" && Number.isFinite(item.viewedAt) && item.viewedAt <= now && now - item.viewedAt <= RECENT_MAX_AGE).sort((a, b) => b.viewedAt - a.viewedAt).forEach((item) => { if (!unique.has(item.id)) unique.set(item.id, item); }); return [...unique.values()].slice(0, 8); } catch { return []; } }
