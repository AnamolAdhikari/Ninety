import "server-only";
import { createHash } from "node:crypto";
import type { ProviderStream, StreamProvider } from "./provider";
import { StreamProviderError } from "./stream-error";

type CatalogEntry = { key?: unknown; embedUrl?: unknown; language?: unknown; quality?: unknown; hd?: unknown; streamNumber?: unknown; expiresAt?: unknown };
type Catalog = Record<string, CatalogEntry[]>;
const opaqueId = (matchId: string, key: string) => `stream-${createHash("sha256").update(`${matchId}:${key}`).digest("hex").slice(0, 12)}`;

export function normalizeCatalogStream(matchId: string, value: unknown, index: number): ProviderStream | null {
  if (!value || typeof value !== "object") return null;
  const item = value as CatalogEntry;
  if (typeof item.embedUrl !== "string") return null;
  let url: URL;
  try { url = new URL(item.embedUrl); } catch { return null; }
  if (url.protocol !== "https:") return null;
  const key = typeof item.key === "string" && item.key ? item.key : String(index + 1);
  return { id: opaqueId(matchId, key), embedUrl: url.toString(), language: typeof item.language === "string" ? item.language : undefined, quality: typeof item.quality === "string" ? item.quality : undefined, hd: item.hd === true, streamNumber: typeof item.streamNumber === "number" ? item.streamNumber : index + 1, expiresAt: typeof item.expiresAt === "string" ? item.expiresAt : undefined };
}

export class ConfiguredStreamProvider implements StreamProvider {
  private readonly catalog: Catalog;
  constructor(catalogJson: string) {
    try { const parsed = JSON.parse(catalogJson); if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid catalog"); this.catalog = parsed as Catalog; }
    catch (error) { throw new StreamProviderError("Authorized stream catalog is invalid.", { cause: error }); }
  }
  async getStreamsForMatch(matchId: string) { const entries = this.catalog[matchId]; if (!Array.isArray(entries)) return []; return entries.map((entry, index) => normalizeCatalogStream(matchId, entry, index)).filter((stream): stream is ProviderStream => stream !== null); }
}
