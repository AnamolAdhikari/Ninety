import "server-only";

type RecordValue = Record<string, unknown>;
export type DiagnosticPlayback = { title: string; language?: string; quality: "HD" | "SD"; embedUrl: string };

const record = (value: unknown): RecordValue | undefined => value && typeof value === "object" ? value as RecordValue : undefined;

export function parseDiagnosticWatchUrl(value: unknown, providerBaseUrl: string) {
  if (typeof value !== "string" || value.length > 500) return null;
  try {
    const input = new URL(value);
    const provider = new URL(providerBaseUrl);
    if (input.protocol !== "https:" || input.origin !== provider.origin || input.search || input.hash) return null;
    const match = input.pathname.match(/^\/watch\/([a-z0-9-]{1,180})\/([a-z0-9-]{1,32})\/([1-9][0-9]{0,2})\/?$/i);
    if (!match) return null;
    return { fixtureReference: match[1], sourceName: match[2].toLowerCase(), streamNumber: Number(match[3]) };
  } catch { return null; }
}

export async function resolveDiagnosticWatchUrl(value: unknown, { providerBaseUrl, allowedEmbedOrigins, fetcher = fetch }: { providerBaseUrl: string; allowedEmbedOrigins: string[]; fetcher?: typeof fetch }): Promise<DiagnosticPlayback | null> {
  const reference = parseDiagnosticWatchUrl(value, providerBaseUrl);
  if (!reference) return null;
  const matchesResponse = await fetcher(`${providerBaseUrl}/api/matches/all`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!matchesResponse.ok) throw new Error("Diagnostic fixture lookup failed.");
  const matches: unknown = await matchesResponse.json();
  if (!Array.isArray(matches)) throw new Error("Diagnostic fixture response was malformed.");
  const fixture = matches.map(record).find((item) => item?.id === reference.fixtureReference);
  if (!fixture || typeof fixture.title !== "string" || !Array.isArray(fixture.sources)) return null;
  const source = fixture.sources.map(record).find((item) => item?.source === reference.sourceName && typeof item.id === "string");
  if (!source || typeof source.id !== "string") return null;
  const streamsResponse = await fetcher(`${providerBaseUrl}/api/stream/${encodeURIComponent(reference.sourceName)}/${encodeURIComponent(source.id)}`, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
  if (!streamsResponse.ok) throw new Error("Diagnostic stream lookup failed.");
  const streams: unknown = await streamsResponse.json();
  if (!Array.isArray(streams)) throw new Error("Diagnostic stream response was malformed.");
  const stream = streams.map(record).find((item) => item?.streamNo === reference.streamNumber && typeof item.embedUrl === "string");
  if (!stream || typeof stream.embedUrl !== "string") return null;
  const embed = new URL(stream.embedUrl);
  if (embed.protocol !== "https:" || !new Set(allowedEmbedOrigins).has(embed.origin)) return null;
  return { title: fixture.title.slice(0, 160), language: typeof stream.language === "string" ? stream.language.slice(0, 80) : undefined, quality: stream.hd === true ? "HD" : "SD", embedUrl: embed.toString() };
}
