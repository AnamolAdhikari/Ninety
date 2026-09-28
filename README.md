# NINETY Live

NINETY Live is a responsive football match schedule and authorized embedded-player experience. It focuses on fast match discovery, clear broadcast states, and graceful handling when a match is scheduled, unavailable, or finished.

## Features

- Football-only schedule with All, Live, Today, and Upcoming views
- Team and match search across available broadcasts
- Responsive match cards and live-status indicators
- Authorized embedded playback with multiple-source support
- Upcoming-match countdown and animated waiting state
- Automatic 60-second recheck when a live broadcast is temporarily unavailable
- Local match-lifecycle safeguards for stale upstream status data
- Animated full-time screen for completed broadcasts
- Mobile-friendly layout and professional footer

## Release 12

Release 12 improves match lifecycle handling:

- A match is considered live only when it is marked live, has a source reference, and remains within 3 hours 30 minutes of kickoff.
- Expired matches are excluded from the Live tab, live count, and live ticker.
- Completed match cards display `ENDED` and `Broadcast ended`.
- The watch page detects completed matches before requesting sources or loading the player.
- Completed broadcasts show an animated full-time scene with a return-to-matches action.
- Scheduled-match countdowns and temporary-unavailability retries continue to work as before.

## Local development

Requirements:

- Node.js 22.13 or newer
- pnpm 11

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Create a production build with:

```bash
pnpm build
```

## Cloudflare deployment

The production build generates a Cloudflare Worker configuration at `dist/server/wrangler.json` targeting the existing `live` Worker at `live.n90.workers.dev`.

For Cloudflare Workers Builds, use:

- Production branch: `main`
- Build command: `pnpm build`
- Deploy command: `pnpm deploy:cloudflare`
- Root directory: `/`

The build requires Node.js 22 and pnpm 11. No application secrets are required by the current release.

## Project structure

- `app/page.tsx` — match discovery, filtering, search, and match cards
- `app/watch/page.tsx` — player, countdown, unavailable, and full-time states
- `app/match-lifecycle.ts` — effective live and ended-state rules
- `app/api/matches/route.ts` — normalized football schedule endpoint
- `app/api/streams/route.ts` — validated embedded-source endpoint
- `app/globals.css` — responsive visual design and animations

## Usage

This project is intended for authorized broadcasts only. Deployments must comply with the applicable broadcast, embedding, and distribution permissions.

## License

No open-source license has been granted. All rights reserved.
