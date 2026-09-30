"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/** Keep motion outside React so feed refreshes and filter clicks never reset it. */
export function MatchTicker({ children }: { children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const hoveredRef = useRef(false);
  const focusedRef = useRef(false);
  const touchRef = useRef(false);
  const overrideRef = useRef(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const viewport = viewportRef.current, track = trackRef.current;
    const group = track?.firstElementChild as HTMLElement | null;
    if (!viewport || !track || !group) return;
    let frame = 0, previous = 0, offset = 0, width = 0;
    const measure = () => {
      // Each identical group must cover the viewport, including sparse feeds.
      track.style.setProperty("--ticker-min-width", `${viewport.clientWidth}px`);
      width = group.getBoundingClientRect().width;
      if (width) offset %= width;
    };
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(group);
    measure();
    const draw = (timestamp: number) => {
      const elapsed = previous ? Math.min(timestamp - previous, 64) : 0;
      previous = timestamp;
      if (width && !pausedRef.current && !hoveredRef.current && !focusedRef.current) {
        offset = (offset + elapsed * 0.032) % width;
        track.style.transform = `translate3d(${-offset}px,0,0)`;
      }
      frame = requestAnimationFrame(draw);
    };
    const visibility = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    try { overrideRef.current = window.localStorage.getItem("ninety-ticker-motion") === "enabled"; } catch {}
    const respectMotion = () => {
      pausedRef.current = motion.matches && !overrideRef.current;
      setPaused(pausedRef.current);
    };
    respectMotion();
    motion.addEventListener("change", respectMotion);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pageshow", visibility);
    visibility();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      motion.removeEventListener("change", respectMotion);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pageshow", visibility);
    };
  }, []);

  return <>
    <div className={"ticker-window " + (paused ? "ticker-manual" : "ticker-automatic")} ref={viewportRef}
      onPointerDownCapture={event => {
        touchRef.current = event.pointerType !== "mouse";
        if (touchRef.current) { hoveredRef.current = false; focusedRef.current = false; }
      }}
      onPointerEnter={event => { if (event.pointerType === "mouse") hoveredRef.current = true; }}
      onPointerLeave={() => { hoveredRef.current = false; }}
      onFocusCapture={() => { focusedRef.current = !touchRef.current; }}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) focusedRef.current = false; }}>
      <div className="ticker-marquee" ref={trackRef}>{children}</div>
    </div>
    {paused && <button className="ticker-mobile-resume" type="button" aria-label="Enable scrolling match ticker" title="Enable scrolling" onClick={() => {
      overrideRef.current = true;
      pausedRef.current = false;
      focusedRef.current = false;
      hoveredRef.current = false;
      setPaused(false);
      try { window.localStorage.setItem("ninety-ticker-motion", "enabled"); } catch {}
    }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></button>}
  </>;
}
