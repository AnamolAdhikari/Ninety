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

Dynamic URLs contain only stable NINETY match IDs. The match center is primarily server-rendered, with a small client boundary for accessible tabs. Its cinematic player is intentionally a visual placeholder: stream lookup, source selection, embeds, HLS, and DASH are not implemented.

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
