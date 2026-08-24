import { NextResponse } from "next/server";
import { isPlaybackDiagnosticEnabled } from "@/server/dev/playback-diagnostic";
import { validateServerEnvironment } from "@/server/config/environment";
import { resolveDiagnosticWatchUrl } from "@/server/providers/stream/diagnostic-watch";

type Dependencies = {
  resolve: typeof resolveDiagnosticWatchUrl;
  register: (playback: Awaited<ReturnType<typeof resolveDiagnosticWatchUrl>>) => Promise<string>;
  configuration: typeof validateServerEnvironment;
};

export function createPlaybackDiagnosticHandler(dependencies: Dependencies, mode: string | undefined) {
  return async (request: Request) => {
    if (!isPlaybackDiagnosticEnabled(mode)) return NextResponse.json({ error: "Not found." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    try {
      const body: unknown = await request.json();
      const watchUrl = body && typeof body === "object" ? (body as { watchUrl?: unknown }).watchUrl : undefined;
      const config = dependencies.configuration();
      if (config.streamProvider !== "streamed" || !config.streamProviderBaseUrl || !config.embedOrigins.length) throw new Error("Real stream provider is not configured.");
      const playback = await dependencies.resolve(watchUrl, { providerBaseUrl: config.streamProviderBaseUrl, allowedEmbedOrigins: config.embedOrigins });
      if (!playback) return NextResponse.json({ error: "The provider watch URL is invalid or unavailable." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      const launchUrl = await dependencies.register(playback);
      return NextResponse.json({ launchUrl }, { headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
    } catch { return NextResponse.json({ error: "Could not prepare isolated playback." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  };
}

const register = async (playback: Awaited<ReturnType<typeof resolveDiagnosticWatchUrl>>) => {
  if (!playback) throw new Error("Playback unavailable.");
  const playerOrigin = process.env.NINETY_PLAYER_ORIGIN ?? "http://127.0.0.1:3006";
  const response = await fetch(`${playerOrigin}/register`, { method: "POST", cache: "no-store", credentials: "omit", redirect: "error", headers: { "Content-Type": "application/json", "x-ninety-player-key": process.env.NINETY_PLAYER_REGISTRATION_KEY ?? "ninety-local-development" }, body: JSON.stringify(playback) });
  if (!response.ok) throw new Error("Isolated player is unavailable.");
  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object" || typeof (payload as { launchUrl?: unknown }).launchUrl !== "string") throw new Error("Isolated player response was malformed.");
  return (payload as { launchUrl: string }).launchUrl;
};

export const POST = createPlaybackDiagnosticHandler({ resolve: resolveDiagnosticWatchUrl, register, configuration: validateServerEnvironment }, process.env.NODE_ENV);
