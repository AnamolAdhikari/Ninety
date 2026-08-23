# NINETY

NINETY is a football-only web application combining live coverage, fixture discovery, club favorites, a premium match center, and operator-authorized playback. It is built for fast server rendering, responsive use from phone to TV browser, and strict separation between browser contracts and upstream providers.

## Screenshots

Screenshots will be added after the first production deployment.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- Motion for limited interaction enhancement
- Lucide icons
- Vitest and ESLint

## Architecture

Pages are Server Components unless they require search, local preferences, tabs, or playback controls. The homepage receives its initial normalized data from the server and does not perform a duplicate browser fetch.

```text
Browser → NINETY pages and /api/football/*
                         ↓
              server-only services
                 ↙             ↘
       FootballProvider      StreamProvider
```

Provider-specific parsing, URLs, credentials, source identifiers, and failures remain server-side. Public models contain only normalized NINETY match IDs, club slugs, competition slugs, and safe presentation data.

## Provider model

`FootballProvider` supplies metadata. `StreamProvider` separately supplies operator-authorized playback. Production defaults are deliberately strict: metadata requires `streamed`, playback requires `configured`, and neither silently falls back to mock data.

Metadata requests use a six-second provider timeout. Schedule data revalidates after 60 seconds; live state is fetched without an upstream cache. Public dashboard and live-facing contracts use short cache windows, while league, club, and search surfaces reuse the normalized provider dataset.

## Stream security model

The browser lists streams using opaque NINETY IDs, then resolves one through a same-origin endpoint. Stream lists and final resolution responses are `no-store`. The final player iframe keeps exactly:

```text
sandbox="allow-scripts allow-same-origin"
```

Popups, top navigation, and sandbox escape are not granted. Browser storage remembers only an opaque NINETY stream selection; it never stores embed URLs, provider credentials, or catalog records. The final authorized embed origin is necessarily visible to the browser performing playback.

## Local development

From Windows PowerShell:

```powershell
Set-Location C:\GitHub\Ninety
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Local development defaults to deterministic mock metadata and playback when provider variables are omitted.

## LAN usage

Start a development server bound to all local interfaces:

```powershell
npm run dev:lan
```

Other devices on the same trusted network can use `http://<local-ip>:3000`. Determine the host address with `ipconfig`; no address is hard-coded. Windows Firewall may request permission for Node.js. Use `npm run start:lan` after a production build for LAN production-mode testing. Do not expose the development server directly to the public internet.

## Environment variables

All integration variables are server-only. Never rename them with a `NEXT_PUBLIC_` prefix.

| Variable | Purpose |
| --- | --- |
| `FOOTBALL_PROVIDER` | `mock` or `streamed` metadata provider |
| `FOOTBALL_PROVIDER_BASE_URL` | HTTPS metadata provider origin; required for `streamed` |
| `FOOTBALL_STREAM_PROVIDER` | `mock` or `configured` playback provider |
| `FOOTBALL_STREAM_CATALOG_JSON` | Operator-authorized JSON catalog; required for `configured` |
| `FOOTBALL_EMBED_ORIGINS` | Comma-separated HTTPS origins allowed by CSP `frame-src` |
| `NINETY_SITE_URL` | Canonical HTTPS deployment origin for metadata, robots, and sitemap |

Configuration is validated server-side. Public failures are normalized and never include raw configuration values, stack traces, provider responses, or credentials.

## Testing

```powershell
npm test
npm run lint
npm run build
```

Tests cover normalization, services, stream failover, public contracts, environment validation, CSP generation, PWA policy, manifest data, and browser-storage sanitization.

## PWA behavior

NINETY includes an installable manifest, NINETY-only generated icon, theme colors, standalone display mode, and a small service worker. The worker caches only the offline shell resources. Football APIs, match-center pages, player preview, streams, and stream-resolution responses are never cached. Navigation remains network-first and falls back to a branded offline page rather than presenting stale live scores as current.

## Deployment

Vercel is the primary deployment target:

1. Import the GitHub repository.
2. configure all production environment variables in the project settings;
3. use `npm run build` as the build command;
4. use the standard Next.js output, or `npm run start` on a compatible Node.js host;
5. set `NINETY_SITE_URL` to the final HTTPS origin; and
6. configure deployment-level rate limiting for search and stream-resolution routes if public traffic requires it.

The application requires a server-capable Next.js runtime. Do not deploy it as a static export. No deployment is performed automatically by repository scripts.

## Security notes

Global headers include a restrictive Content Security Policy, `nosniff`, no-referrer behavior, a limited permissions policy, same-origin framing, and a compatible opener policy. Production adds HSTS. `frame-src` contains only same-origin and explicitly configured HTTPS embed origins. CSP retains inline styles and scripts needed by the current Next.js runtime; production does not allow `unsafe-eval`.

Public APIs validate calendar dates, slugs, opaque IDs, search size, and favorites batch size. Errors use stable NINETY codes and `no-store`. Same-origin usage is expected and no permissive CORS headers are added.

## Public routes

```text
/                         Football dashboard
/live                     Live matches
/matches                  Date and competition fixture browser
/leagues                  Available competitions
/league/[slug]            Competition match view
/club/[slug]              Club match view and follow control
/favorites                Device-local favorite clubs
/watch/[matchId]           Match center and authorized player
/offline                   PWA offline fallback
```

`/player-preview` is development-only and returns not found in production. Robots exclude APIs, offline fallback, and preview surfaces. The sitemap contains stable public discovery routes and intentionally omits transient match/player URLs.

## Known limitations

- Favorites and recents are device-local; there are no accounts or cross-device sync.
- Provider coverage determines available competitions, crests, fixtures, and streams. Missing data is not fabricated.
- The in-memory/process-level deployment does not implement distributed rate limiting; use platform controls when needed.
- Live scores require connectivity and are intentionally not available from offline cache.
- Authorized third-party embed behavior remains subject to that operator’s browser and CSP compatibility.
