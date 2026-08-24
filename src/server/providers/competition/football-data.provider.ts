import "server-only";
import type { CompetitionFixture, CompetitionMetadataProvider } from "./provider";

type UnknownRecord = Record<string, unknown>;
export const COMPETITION_METADATA_TIMEOUT_MS = 5_000;
export const LIVE_COMPETITION_REVALIDATE_SECONDS = 15;
export const UPCOMING_COMPETITION_REVALIDATE_SECONDS = 5 * 60;
export const FINISHED_COMPETITION_REVALIDATE_SECONDS = 15 * 60;

const record = (value: unknown): UnknownRecord | undefined => value && typeof value === "object" ? value as UnknownRecord : undefined;
const label = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const integer = (value: unknown) => typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;

export function normalizeFootballDataStatus(value: unknown): CompetitionFixture["status"] {
  const status = label(value)?.toUpperCase();
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status ?? "")) return "LIVE";
  if (["FINISHED", "AWARDED"].includes(status ?? "")) return "FINISHED";
  if (["SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED", "CANCELLED"].includes(status ?? "")) return "UPCOMING";
  return undefined;
}

export function competitionCacheSeconds(fixtures: CompetitionFixture[]) {
  if (fixtures.some((fixture) => fixture.status === "LIVE")) return LIVE_COMPETITION_REVALIDATE_SECONDS;
  if (fixtures.some((fixture) => fixture.status === "UPCOMING")) return UPCOMING_COMPETITION_REVALIDATE_SECONDS;
  return FINISHED_COMPETITION_REVALIDATE_SECONDS;
}

export function normalizeFootballDataFixture(value: unknown): CompetitionFixture | null {
  const item = record(value);
  const competition = record(item?.competition);
  const area = record(item?.area);
  const home = record(item?.homeTeam);
  const away = record(item?.awayTeam);
  const kickoff = label(item?.utcDate);
  const homeTeam = label(home?.name ?? home?.shortName);
  const awayTeam = label(away?.name ?? away?.shortName);
  const competitionName = label(competition?.name);
  if (!kickoff || Number.isNaN(new Date(kickoff).valueOf()) || !homeTeam || !awayTeam || !competitionName) return null;
  const score = record(item?.score);
  const fullTime = record(score?.fullTime);
  const status = normalizeFootballDataStatus(item?.status);
  return { homeTeam, awayTeam, kickoff: new Date(kickoff).toISOString(), competition: competitionName, country: label(area?.name), status, minute: integer(item?.minute), homeScore: integer(fullTime?.home), awayScore: integer(fullTime?.away) };
}

export class FootballDataCompetitionProvider implements CompetitionMetadataProvider {
  private cache?: { fixtures: CompetitionFixture[]; expiresAt: number };
  constructor(private readonly baseUrl: string, private readonly token: string, private readonly fetcher: typeof fetch = fetch, private readonly clock: () => Date = () => new Date(), private readonly timeoutMs = COMPETITION_METADATA_TIMEOUT_MS) {
    if (new URL(baseUrl).protocol !== "https:") throw new Error("Competition metadata provider must use HTTPS.");
  }

  async getFixtures(): Promise<CompetitionFixture[]> {
    const now = this.clock();
    if (this.cache && this.cache.expiresAt > now.valueOf()) return this.cache.fixtures;
    const dateFrom = new Date(now); dateFrom.setUTCDate(dateFrom.getUTCDate() - 2);
    const dateTo = new Date(now); dateTo.setUTCDate(dateTo.getUTCDate() + 8);
    const url = new URL(`${this.baseUrl.replace(/\/$/, "")}/matches`);
    url.searchParams.set("dateFrom", dateFrom.toISOString().slice(0, 10));
    url.searchParams.set("dateTo", dateTo.toISOString().slice(0, 10));
    const response = await this.fetcher(url, { headers: { "X-Auth-Token": this.token }, signal: AbortSignal.timeout(this.timeoutMs), cache: "no-store" });
    if (!response.ok) throw new Error(`Competition metadata request returned ${response.status}.`);
    const payload: unknown = await response.json();
    const matches = record(payload)?.matches;
    if (!Array.isArray(matches)) throw new Error("Competition metadata response was malformed.");
    const fixtures = matches.map(normalizeFootballDataFixture).filter((fixture): fixture is CompetitionFixture => fixture !== null);
    this.cache = { fixtures, expiresAt: now.valueOf() + competitionCacheSeconds(fixtures) * 1000 };
    return fixtures;
  }
}
