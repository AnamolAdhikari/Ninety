import { ExternalLink, Radio } from "lucide-react";
import type { Match } from "@/domain/football/types";
import { getIsolatedPlayerLauncher } from "@/features/stream/utils/isolated-player";

export function SecurePlayerLauncher({ match, isolatedPlayerOrigin }: { match: Match; isolatedPlayerOrigin?: string }) {
  const launcher = getIsolatedPlayerLauncher(process.env.NODE_ENV, match.id, isolatedPlayerOrigin);
  return <section aria-label="Secure football player" className="relative overflow-hidden rounded-[26px] border border-white/[.08] bg-[radial-gradient(circle_at_80%_10%,rgba(199,255,74,.12),transparent_34%),#090c10] px-6 py-10 text-center shadow-[0_35px_100px_rgba(0,0,0,.4)] sm:px-10 sm:py-14">
    <Radio className="mx-auto text-[#c7ff4a]" size={32}/>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#ff5969]">{match.status === "LIVE" ? "Live now" : "Match stream"}</p>
    <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-[-.04em] sm:text-4xl">Watch {match.home.name} vs {match.away.name}</h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#9299a2]">Playback opens on NINETY&apos;s isolated player origin. Source selection, retry, video, audio, and fullscreen stay outside the main app.</p>
    {launcher ? <a href={launcher.href} target={launcher.target} rel={launcher.rel} referrerPolicy="no-referrer" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c7ff4a] px-6 text-sm font-black text-[#080a0d] outline-none focus-visible:ring-2 focus-visible:ring-white"><ExternalLink size={17}/>Open Secure Player</a> : <p className="mt-7 text-sm font-semibold text-[#ff7884]">Secure player is not configured. Try again later.</p>}
    <p className="mt-5 text-xs text-white/40">If another tab opens after you press Play, close it and return to the isolated player. The NINETY tab will remain separate.</p>
  </section>;
}
