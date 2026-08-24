const OPAQUE_ID_PATTERN = /^[a-z0-9-]{1,160}$/;

export function getIsolatedPlayerLauncher(
  mode: string | undefined,
  matchId: string,
  configuredOrigin?: string,
) {
  if (!OPAQUE_ID_PATTERN.test(matchId)) return null;
  const playerOrigin = configuredOrigin ?? (mode === "development" ? "http://127.0.0.1:3006" : undefined);
  if (!playerOrigin) return null;
  try {
    const url = new URL("/", playerOrigin);
    const localDevelopment = mode === "development" && url.protocol === "http:" && url.hostname === "127.0.0.1";
    if (!localDevelopment && url.protocol !== "https:") return null;
    url.searchParams.set("match", matchId);
    return { href: url.toString(), target: "_blank" as const, rel: "noopener noreferrer" };
  } catch {
    return null;
  }
}
