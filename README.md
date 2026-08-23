# NINETY

NINETY is a football-only match experience built with Next.js, TypeScript, Tailwind CSS, Motion, and Lucide.

## Local development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Validation commands:

```bash
npm run test
npm run lint
npm run build
```

## Football provider architecture

The browser only requests `GET /api/football/dashboard`. That NINETY route calls the server-only `FootballService`, which obtains normalized matches through the `FootballProvider` contract. Provider implementations own all upstream response parsing; raw provider records, source IDs, stream information, configuration, and errors never cross the API boundary.

```text
Browser → /api/football/dashboard → FootballService → FootballProvider
                                                    ├─ StreamedFootballProvider
                                                    └─ MockFootballProvider
```

Match navigation follows the same server-owned boundary:

```text
Dashboard → /watch/[matchId]
                    ↓
       FootballService.getMatchCenter
                    ↓
      normalized match + related matches

Browser API consumers → /api/football/match/[matchId] → FootballService
```

Dynamic URLs contain only stable NINETY match IDs. The match center is primarily server-rendered, with small client boundaries for accessible tabs, local time, and authorized playback.

## Authorized stream playback

Playback uses a separate server-only boundary and never calls the football metadata provider's stream endpoints:

```text
Browser → /api/football/match/:id/streams → StreamService → StreamProvider

Browser selects opaque NINETY stream ID
  → /api/football/match/:id/streams/:streamId
  → server resolves the operator-authorized catalog entry
  → browser receives only the final embed URL
  → sandboxed iframe
```

Production requires `FOOTBALL_STREAM_PROVIDER=configured` and an operator-maintained `FOOTBALL_STREAM_CATALOG_JSON`. Catalog keys must be NINETY match IDs and entries must use authorized HTTPS embed URLs. Development defaults to a same-origin mock player. Production never falls back to mock playback.

The stream list and resolution endpoints use `no-store`; embed URLs are not retained in browser storage. Only the selected opaque NINETY stream ID is remembered per match. Resolution failures try each listed source at most once. The iframe sandbox is `allow-scripts allow-same-origin`; popups and top-level navigation are intentionally not granted. Its permissions allow only autoplay, fullscreen, and picture-in-picture.

The final embed host is necessarily visible in browser DevTools because the browser connects to it. Provider configuration, catalog contents, credentials, and upstream identifiers remain server-only.

## Football discovery

Public routes:

```text
/                         Personalized football dashboard
/live                     Live football, filterable by competition
/matches?date=YYYY-MM-DD  Shareable seven-day fixtures browser
/leagues                  Available normalized competitions
/league/[slug]            League live/today/upcoming fixtures
/club/[slug]              Club fixtures and follow control
/favorites                Browser-local favorite clubs
/watch/[matchId]           Match center and authorized player
```

Discovery uses normalized NINETY models only. Competition slugs are derived from normalized names, and club slugs are generated in the provider normalization layer; neither exposes source identifiers. Server-side discovery methods filter a single normalized match collection for dates, live states, competitions, clubs, and search results. Search is debounced in the browser, requires two characters, and calls only `/api/football/search`.

Date and competition filters are encoded in the `/matches` query string, preserving refresh, back/forward navigation, and sharing. Favorites (`ninety.favorite.clubs`) and recently viewed matches (`ninety.recent.matches`) remain browser-local in V1 and contain only NINETY slugs/IDs and timestamps. They contain no embed URLs or provider data.

The service deduplicates matches and produces separately sorted `live`, `today`, and `upcoming` collections. Live matches prioritize provider-supplied popularity, while today and upcoming matches are chronological. The provider uses a six-second timeout, a no-store live request, and a 60-second schedule revalidation. The public dashboard response has a short CDN cache window.

## Environment configuration

All provider settings are server-only. Do not add `NEXT_PUBLIC_` prefixes.

```dotenv
FOOTBALL_PROVIDER=streamed
FOOTBALL_PROVIDER_BASE_URL=https://streamed.pk
```

Supported `FOOTBALL_PROVIDER` values:

- `streamed` uses the real football metadata provider and requires an HTTPS base URL.
- `mock` uses deterministic local data for development and tests.

When unset, development defaults to `mock` and production defaults to `streamed`. Production therefore cannot silently fall back to fabricated match data. Copy `.env.example` to the ignored `.env.local` file for local configuration; never commit secrets.

## Data policy

Only football match metadata is retrieved. Stream endpoints and player functionality are outside this phase. External data is converted into NINETY domain models with stable internal match IDs and slugs. Missing scores, competition metadata, crests, or match states are not fabricated; the UI renders honest fallbacks and empty states.
