import "server-only";
import { createHash } from "node:crypto";
import type { Match, MatchStatus, Team } from "@/domain/football/types";
import type { FootballProvider } from "./provider";
import { FootballProviderError } from "./provider-error";

type UnknownRecord = Record<string, unknown>;
interface StreamedMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular: boolean;
  teams?: { home?: { name: string; badge?: string }; away?: { name: string; badge?: string } };
}

const palette: [string, string][] = [["#2962ff", "#0d1b45"], ["#d8173c", "#52101d"], ["#1aa36f", "#073f2b"], ["#8c5cff", "#2b195c"]];
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 72);
const shortHash = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 10);
const optionalUrl = (value: unknown, baseUrl: string) => {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try { const url = new URL(value, `${baseUrl}/`); return url.protocol === "https:" ? url.toString() : undefined; } catch { return undefined; }
};

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
  return { id: item.id, title: item.title, category: "football", date: item.date, poster: typeof item.poster === "string" ? item.poster : undefined, popular: item.popular === true, teams: { home, away } };
}

function makeTeam(name: string, badge: unknown, baseUrl: string): Team {
  const slug = slugify(name) || "team";
  const colorIndex = Number.parseInt(shortHash(name).slice(0, 2), 16) % palette.length;
  return { id: `${slug}-${shortHash(name).slice(0, 4)}`, name, shortName: name.split(/\s+/).map((word) => word[0]).join("").slice(0, 3).toUpperCase(), colors: palette[colorIndex], crestUrl: optionalUrl(badge, baseUrl) };
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
  return { id: `${slug}-${shortHash(`${raw.id}:${raw.date}`)}`, slug, competition: "Football", stage: status === "LIVE" ? "Live coverage" : "Scheduled", status, popular: raw.popular, kickoff: kickoff.toISOString(), posterUrl: optionalUrl(raw.poster, baseUrl), home: makeTeam(homeName, raw.teams.home.badge, baseUrl), away: makeTeam(awayName, raw.teams.away.badge, baseUrl) };
}

export class StreamedFootballProvider implements FootballProvider {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = fetch, private readonly timeoutMs = 6_000) {
    if (!/^https:\/\//i.test(baseUrl)) throw new FootballProviderError("FOOTBALL_PROVIDER_BASE_URL must use HTTPS.");
  }

  async getMatches(): Promise<Match[]> {
    try {
      const signal = AbortSignal.timeout(this.timeoutMs);
      const [footballResponse, liveResponse] = await Promise.all([
        this.fetcher(`${this.baseUrl}/api/matches/football`, { signal, next: { revalidate: 60 } }),
        this.fetcher(`${this.baseUrl}/api/matches/live`, { signal, cache: "no-store" }),
      ]);
      if (!footballResponse.ok || !liveResponse.ok) throw new Error(`Upstream returned ${footballResponse.status}/${liveResponse.status}`);
      const [football, live] = await Promise.all([footballResponse.json(), liveResponse.json()]);
      if (!Array.isArray(football) || !Array.isArray(live)) throw new Error("Upstream response was not a match array");
      const liveIds = new Set(live.flatMap((item) => item && typeof item === "object" && typeof (item as UnknownRecord).id === "string" ? [(item as UnknownRecord).id as string] : []));
      return football.map((item) => normalizeStreamedMatch(item, liveIds, this.baseUrl)).filter((match): match is Match => match !== null);
    } catch (error) {
      throw new FootballProviderError("Football data provider is unavailable.", { cause: error });
    }
  }
}
