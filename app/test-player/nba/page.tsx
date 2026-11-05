"use client";

import { useState } from "react";

// Temporary integration test only. Do not link from the football Match Centre.
// Uses the same iframe permissions and watch-player class as app/watch/page.tsx.
const TEST_EMBED = "https://taifood-blog.asia/embed/nba/2026-11-04/phi-det";

export default function NbaPlaybackTest() {
  const [reload, setReload] = useState(0);
  return (
    <main className="watch-page">
      <header className="watch-header">
        <a className="back-link" href="/">← Back to Ninety</a>
      </header>
      <div className="watch-wrap">
        <div className="watch-title">
          <div>
            <span className="eyebrow">TEMPORARY EMBED TEST</span>
            <h1>Philadelphia 76ers vs. Detroit Pistons</h1>
            <p>PPV.st approved iframe • video, audio and fullscreen test</p>
          </div>
        </div>
        <div className="watch-availability ready" role="status">
          <strong>Iframe loaded for testing</strong>
          <span>Video and audio must be verified manually. A loaded iframe is not proof of playback.</span>
        </div>
        <div className="watch-player">
          <iframe
            key={reload}
            src={TEST_EMBED}
            title="NBA temporary broadcast playback test"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button type="button" onClick={() => setReload(n => n + 1)}>Reload player</button>
          <a href={TEST_EMBED} target="_blank" rel="noopener noreferrer">Open original embed</a>
        </div>
        <p style={{ marginTop: 16 }}>
          Test-only route. No NBA fixtures, broadcast catalogue entries, or football Match Centre behavior are changed.
          Remove this route after testing.
        </p>
      </div>
    </main>
  );
}
