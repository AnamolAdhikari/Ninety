import { notFound } from "next/navigation";
import { PlaybackDiagnosticForm } from "@/features/stream/components/playback-diagnostic-form";
import { isPlaybackDiagnosticEnabled } from "@/server/dev/playback-diagnostic";

export default function PlaybackDiagnosticPage() {
  if (!isPlaybackDiagnosticEnabled(process.env.NODE_ENV)) notFound();
  return <main className="page-shell py-16 sm:py-24">
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-black uppercase tracking-[.2em] text-[#c7ff4a]">Development only</p>
      <h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-6xl">Development playback test</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-white/50">Use a stream that is currently confirmed playing directly in your browser. The URL is resolved server-side into a short-lived opaque isolated-player request.</p>
      <PlaybackDiagnosticForm/>
    </div>
  </main>;
}
