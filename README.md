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

Metadata requests use a 15-second provider timeout. Schedule data revalidates after 60 seconds; live state is fetched without an upstream cache. Public dashboard and live-facing contracts use short cache windows, while league, club, and search surfaces reuse the normalized provider dataset.

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
pnpm install --frozen-lockfile
Copy-Item .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. Local development defaults to deterministic mock metadata and playback when provider variables are omitted.

## LAN usage

Start a development server bound to all local interfaces:

```powershell
pnpm dev:lan
```

Other devices on the same trusted network can use `http://<local-ip>:3000`. Determine the host address with `ipconfig`; no address is hard-coded. Windows Firewall may request permission for Node.js. Use `pnpm start:lan` after a production build for LAN production-mode testing. Do not expose the development server directly to the public internet.

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
pnpm test
pnpm lint
pnpm build
```

Tests cover normalization, services, stream failover, public contracts, environment validation, CSP generation, PWA policy, manifest data, and browser-storage sanitization.

## PWA behavior

NINETY includes an installable manifest, NINETY-only generated icon, theme colors, standalone display mode, and a small service worker. The worker caches only the offline shell resources. Football APIs, match-center pages, player preview, streams, and stream-resolution responses are never cached. Navigation remains network-first and falls back to a branded offline page rather than presenting stale live scores as current.

## Cloudflare Workers deployment

Production uses `@opennextjs/cloudflare` to transform the full-stack Next.js build for Cloudflare `workerd`; Wrangler manages preview, bindings, observability, versions, and deployment. This is the current Workers adapter, not the deprecated Next.js-on-Pages pattern.

```text
User
  ↓
Cloudflare edge: static/PWA assets, rate limiting, Images, Workers Logs
  ↓
NINETY Worker / OpenNext: Next.js UI + same-origin API/BFF
  ↓
FootballService / StreamService
  ↓
server-only metadata and authorized playback providers
```

App Router, Server Components, route handlers, dynamic/metadata routes, API routes, and ISR are supported. `nodejs_compat` supports Next.js and the server-only SHA-256 helpers. Remote crests retain narrow `remotePatterns` and use the `IMAGES` binding; Cloudflare Images may incur separate charges.

### Commands and prerequisites

Use Node.js 22 and pnpm 11:

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
pnpm cf:build
pnpm cf:preview
```

`pnpm dev` and `pnpm dev:lan` remain independent of Wrangler. On Windows, use WSL or Linux CI if an OpenNext native build encounters a platform limitation.

### Environment and secrets

No server variable is `NEXT_PUBLIC_*`, and no real value belongs in Git. Configure runtime values in the Cloudflare dashboard; Workers Builds also needs required values under Build variables and secrets.

| Variable | Classification | Cloudflare handling |
| --- | --- | --- |
| `FOOTBALL_PROVIDER` | Runtime config | Worker variable (`streamed`) |
| `FOOTBALL_PROVIDER_BASE_URL` | Runtime config | Worker variable; HTTPS only |
| `FOOTBALL_STREAM_PROVIDER` | Runtime config | Worker variable (`configured`) |
| `FOOTBALL_STREAM_CATALOG_JSON` | Runtime secret | `pnpm wrangler secret put FOOTBALL_STREAM_CATALOG_JSON` |
| `FOOTBALL_EMBED_ORIGINS` | Runtime security config | Worker variable; explicit HTTPS origins only |
| `NINETY_SITE_URL` | Build/runtime config | Initial HTTPS workers.dev URL, later custom origin |
| `NINETY_ALLOWED_DEV_ORIGINS` | Development-only | Local `.env` only; omit in production |

Authenticate with `pnpm wrangler login`, set non-secret variables in the dashboard, add the catalog secret, then run `pnpm cf:deploy`. The script uses `--keep-vars` so dashboard variables survive deployment. Set `NINETY_SITE_URL` to the resulting `https://<worker>.<subdomain>.workers.dev` origin and redeploy. A custom domain can later be attached under the Worker’s Domains & Routes settings; Cloudflare provisions HTTPS, after which update `NINETY_SITE_URL` and redeploy.

### Rate limits, caching, observability

Cloudflare-native bindings enforce search at 30/minute, metadata at 120/minute, and playback list/resolution at 20/minute. Rejections return normalized `429` JSON with `Retry-After: 60`, `no-store`, and a request ID. Counters are per Cloudflare location and eventually consistent, so they are abuse protection rather than accounting controls.

Hashed static assets keep immutable caching. Metadata/search APIs retain short explicit CDN windows. Stream lists and resolutions remain `no-store`; the service worker excludes `/api/*`, `/watch/*`, and `/player-preview`, while navigation is network-first. Device-local favorites never enter shared server caches.

Workers Logs is enabled in `wrangler.jsonc`. View events under Cloudflare Dashboard → Workers & Pages → `ninety-football` → Observability, or run `pnpm wrangler tail`. Structured logs contain event names, request IDs, policies, and counts—not catalogs, embed URLs, provider payloads, credentials, or sensitive headers.

### CI/CD, smoke tests, rollback

GitHub Actions runs frozen pnpm installation, tests, lint, the standard Next build, and the OpenNext build on pull requests and pushes to `master`/`main`. It does not deploy. A later gated deployment should store `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub secrets and run only after validation on the production branch.

After preview or deployment, set `NINETY_SMOKE_URL=https://...` and run `pnpm cf:smoke`. It discovers a current match when available and checks public pages/APIs, PWA files, production headers, provider privacy, and playback `no-store` without depending on a permanent fixture.

Rollback from the Cloudflare Deployments view or run `pnpm wrangler rollback` and select a known-good version. For source rollback, revert the Git commit, rerun validation, and deploy. Bindings/resources are not rolled back with code.

Free-tier request/CPU limits, compressed Worker size, Images charges, and log retention can change; confirm current limits before launch. The application remains database-free. Production CSP exposes only explicit authorized `frame-src` hostnames required by the browser, never credentials or catalog data.

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
