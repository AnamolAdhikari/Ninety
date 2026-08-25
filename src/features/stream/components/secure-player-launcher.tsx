import { ExternalLink, Radio } from "lucide-react";
import type { Match } from "@/domain/football/types";
import { getIsolatedPlayerLauncher } from "@/features/stream/utils/isolated-player";

export function SecurePlayerLauncher({ match, isolatedPlayerOrigin }: { match: Match; isolatedPlayerOrigin?: string }) {
  const launcher = getIsolatedPlayerLauncher(process.env.NODE_ENV, match.id, isolatedPlayerOrigin);
  return <section aria-label="Secure football player" className="relative grid min-h-[260px] place-items-center overflow-hidden rounded-[22px] border border-white/[.08] bg-[radial-gradient(circle_at_80%_10%,rgba(199,255,74,.12),transparent_34%),#030405] px-5 py-8 text-center shadow-[0_35px_100px_rgba(0,0,0,.4)] sm:aspect-video sm:px-10"><div>
    <Radio className="mx-auto text-[#c7ff4a]" size={32}/>
    <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#ff5969]">{match.status === "LIVE" ? "Live now" : "Match stream"}</p>
    <h2 className="mx-auto mt-3 max-w-2xl text-2xl font-semibold tracking-[-.04em] sm:text-4xl">Watch {match.home.name} vs {match.away.name}</h2>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#9299a2]">Choose a source, retry, and use fullscreen in NINETY&apos;s isolated player.</p>
    {launcher ? <a href={launcher.href} target={launcher.target} rel={launcher.rel} referrerPolicy="no-referrer" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#c7ff4a] px-6 text-sm font-black text-[#080a0d] outline-none focus-visible:ring-2 focus-visible:ring-white"><ExternalLink size={17}/>Watch Live</a> : <p className="mt-6 text-sm font-semibold text-[#ff7884]">Playback is not configured. Try again later.</p>}
    <p className="mt-4 text-[11px] text-white/35">Playback stays separate from the main NINETY tab.</p></div>
  </section>;
}
