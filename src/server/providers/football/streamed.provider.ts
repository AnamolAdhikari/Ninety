import "server-only";
import { createHash } from "node:crypto";
import type { Match, MatchStatus, Team } from "@/domain/football/types";
import type { FootballProvider } from "./provider";
import { FootballProviderError } from "./provider-error";
import { logServerEvent } from "@/server/observability/logger";

type UnknownRecord = Record<string, unknown>;
interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  competition?: { name: string; country?: string };
  teams?: { home?: { name: string; badge?: string }; away?: { name: string; badge?: string } };
}

const cleanMetadataLabel = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const label = value.replace(/\s+/g, " ").trim();
  return label && label.length <= 120 && !/[\u0000-\u001f\u007f]/.test(label) ? label : undefined;
};

function readCountry(value: unknown): string | undefined {
  if (typeof value === "string") return cleanMetadataLabel(value);
  if (!value || typeof value !== "object") return undefined;
  return cleanMetadataLabel((value as UnknownRecord).name);
}

export function readStreamedCompetition(value: unknown): { name: string; country?: string } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const item = value as UnknownRecord;
  for (const key of ["competition", "league", "tournament"] as const) {
    const candidate = item[key];
    const name = typeof candidate === "string"
      ? cleanMetadataLabel(candidate)
      : candidate && typeof candidate === "object"
        ? cleanMetadataLabel((candidate as UnknownRecord).name ?? (candidate as UnknownRecord).title)
        : undefined;
    if (!name) continue;
    const nestedCountry = candidate && typeof candidate === "object" ? readCountry((candidate as UnknownRecord).country) : undefined;
    const country = nestedCountry ?? readCountry(item.country);
    return country ? { name, country } : { name };
  }
  return undefined;
}

export const STREAMED_METADATA_TIMEOUT_MS = 15_000;
const palette: [string, string][] = [["#2962ff", "#0d1b45"], ["#d8173c", "#52101d"], ["#1aa36f", "#073f2b"], ["#8c5cff", "#2b195c"]];
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);
const shortHash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 10);
const optionalProviderAssetUrl = (value: unknown, baseUrl: string) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try { const url = new URL(value, `${baseUrl}/`); const provider = new URL(baseUrl); return url.protocol === "https:" && url.origin === provider.origin ? url.toString() : undefined; } catch { return undefined; }
};

export function buildStreamedBadgeUrl(baseUrl: string, badge: unknown): string | undefined {
  if (typeof badge !== "string" || !badge.trim()) return undefined;
  try {
    const provider = new URL(baseUrl);
    if (provider.protocol !== "https:") return undefined;
    const value = badge.trim();
    if (/^https?:\/\//i.test(value)) { const url = new URL(value); return url.protocol === "https:" && url.origin === provider.origin ? url.toString() : undefined; }
    if (value.startsWith("/api/images/") || value.startsWith("/images/")) return new URL(value, provider.origin).toString();
    return `${provider.origin}/api/images/badge/${encodeURIComponent(value)}.webp`;
  } catch { return undefined; }
}

function parseRaw(value: unknown): StreamedMatch | null {
  if (!value || typeof value !== "object") return null;
  const item = value as UnknownRecord;
  if (typeof item.id !== "string" || typeof item.title !== "string" || typeof item.date !== "number" || !Number.isFinite(item.date)) return null;
  if (item.category !== "football") return null;
  const teams = item.teams && typeof item.teams === "object" ? item.teams as UnknownRecord : undefined;
  const readSide = (side: "home" | "away") => {
    const raw = teams?.[side];
    if (!raw || typeof raw !== "object") return undefined;
    const record = raw as UnknownRecord;
    return typeof record.name === "string" && record.name.trim() ? { name: record.name.trim(), badge: typeof record.badge === "string" ? record.badge : undefined } : undefined;
  };
  const fromTitle = item.title.split(/\s+(?:vs?\.?|-)\s+/i).map((part) => part.trim()).filter(Boolean);
  const home = readSide("home") ?? (fromTitle[0] ? { name: fromTitle[0], badge: undefined } : undefined);
  const away = readSide("away") ?? (fromTitle[1] ? { name: fromTitle[1], badge: undefined } : undefined);
  if (!home || !away) return null;
  return { id: item.id, title: item.title, category: "football", date: item.date, poster: typeof item.poster === "string" ? item.poster : undefined, popular: item.popular === true, competition: readStreamedCompetition(item), teams: { home, away } };
}

function makeTeam(name: string, badge: unknown, baseUrl: string): Team {
  const slug = slugify(name) || "team";
  const colorIndex = Number.parseInt(shortHash(name).slice(0, 2), 16) % palette.length;
  return { id: `${slug}-${shortHash(name).slice(0, 4)}`, slug, name, shortName: name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase(), colors: palette[colorIndex], crestUrl: buildStreamedBadgeUrl(baseUrl, badge) };
}

export function normalizeStreamedMatch(value: unknown, liveIds: ReadonlySet<string>, baseUrl: string, now = new Date()): Match | null {
  const raw = parseRaw(value);
  if (!raw || !raw.teams?.home || !raw.teams.away) return null;
  const kickoff = new Date(raw.date);
  if (Number.isNaN(kickoff.valueOf())) return null;
  const homeName = raw.teams.home.name;
  const awayName = raw.teams.away.name;
  const slug = `${slugify(homeName)}-v-${slugify(awayName)}`;
  const status: MatchStatus = liveIds.has(raw.id) ? "LIVE" : kickoff.valueOf() < now.valueOf() - 4 * 60 * 60 * 1000 ? "FINISHED" : "UPCOMING";
  return { id: `${slug}-${shortHash(`${raw.id}:${raw.date}`)}`, slug, competition: raw.competition?.name ?? "Football", competitionCountry: raw.competition?.country, stage: status === "LIVE" ? "Live coverage" : "Scheduled", status, popular: raw.popular, kickoff: kickoff.toISOString(), posterUrl: optionalProviderAssetUrl(raw.poster, baseUrl), home: makeTeam(homeName, raw.teams.home.badge, baseUrl), away: makeTeam(awayName, raw.teams.away.badge, baseUrl) };
}

export class StreamedFootballProvider implements FootballProvider {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = STREAMED_METADATA_TIMEOUT_MS) {
    if (!/^https:\/\//i.test(baseUrl)) throw new FootballProviderError("FOOTBALL_PROVIDER_BASE_URL must use HTTPS.");
  }

  async getMatches(): Promise<Match[]> {
    try {
      const readArray = async (path: string, init: RequestInit) => {
        const response = await this.fetcher(`${this.baseUrl}${path}`, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
        if (!response.ok) throw new Error(`Upstream ${path} returned ${response.status}`);
        const data: unknown = await response.json();
        if (!Array.isArray(data)) throw new Error(`Upstream ${path} was not a match array`);
        return data;
      };
      const [footballResult, liveResult] = await Promise.allSettled([
        readArray("/api/matches/football", { next: { revalidate: 60 } }),
        readArray("/api/matches/live", { cache: "no-store" }),
      ]);
      if (footballResult.status === "rejected") throw footballResult.reason;
      const football = footballResult.value;
      const live = liveResult.status === "fulfilled" ? liveResult.value : [];
      const liveIds = new Set(live.flatMap((item) => item && typeof item === "object" && typeof (item as UnknownRecord).id === "string" ? [(item as UnknownRecord).id as string] : []));
      const normalized = football.map((item) => normalizeStreamedMatch(item, liveIds, this.baseUrl));
      const rejected = normalized.filter((match) => match === null).length;
      if (rejected) logServerEvent("normalization_rejected", undefined, { count: rejected });
      return normalized.filter((match): match is Match => match !== null);
    } catch (error) {
      const timeout = error instanceof Error && (error.name === "TimeoutError" || (error.cause instanceof Error && error.cause.name === "TimeoutError"));
      logServerEvent(timeout ? "provider_timeout" : "provider_unavailable");
      throw new FootballProviderError("Football data provider is unavailable.", { cause: error });
    }
  }
}
