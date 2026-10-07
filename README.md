<div align="center">

# NINETY

### A modern football matchday experience built for the web

Fast match discovery, live-state handling, resilient playback UX, match events, lineups, saved matches, reminders, and polished post-match flows in one responsive interface.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Status](https://img.shields.io/badge/status-active-brightgreen)
![License](https://img.shields.io/badge/license-all%20rights%20reserved-lightgrey)

</div>

---

## Overview

**NINETY** is a personal football matchday project focused on making live and upcoming fixtures easy to discover and pleasant to follow across desktop and mobile.

The application is designed around real match states rather than a static list of links. A fixture can move through **upcoming → live → finished**, with the interface adapting automatically at each stage.

The project also treats external data and playback availability as unreliable inputs. Provider failures, missing lineups, stale statuses, unavailable sources, and completed broadcasts are handled as explicit product states instead of uncaught errors.

> **Project note:** NINETY is a personal learning project. Playback is intended only for sources the operator is authorized to use. This repository does not document private provider credentials, internal access configuration, or deployment secrets.

<!-- HERO_SCREENSHOT -->
<!-- Recommended final asset: docs/media/home-desktop.webp -->


---

## Product highlights

### Match discovery

- All, Live, Today, Upcoming, Favorites, and personal matchday views
- Fast team and competition search
- Featured fixtures and live-match ticker
- Grid and compact layouts
- Responsive desktop and mobile experience
- Team badges with graceful fallbacks
- Saved matches, preferred teams, and reminders

### Matchday experience

- Upcoming-match countdowns
- Live-state detection with stale-status safeguards
- Multiple-source selection when more than one authorized source is available
- Playback recovery controls
- Cinema and fullscreen viewing modes
- Offline and unavailable-source states
- User-controlled rejection of an incorrect broadcast source
- Automatic re-checking when no usable source is available

### Match center

- Match Events shown first during live fixtures
- Live timeline refresh behavior for goals, cards, VAR, and substitutions when data is available
- Starting lineups loaded **only when requested**
- Confirmed-XI display with team formations and player imagery when available
- Quota-aware provider failure states
- No invented lineups or scores

### Full-time experience

- Finished matches automatically leave Live surfaces
- Final-score presentation when a verified result is available
- Independent result fallback when the primary match-data service is unavailable
- Final event timeline
- Confirmed lineups remain accessible
- YouTube highlights discovery after full time
- Dedicated finished-match presentation instead of a dead player

---

## Engineering documentation

NINETY includes a public-safe engineering notebook for readers who want to go beyond the product surface:

- [System Design](docs/system-design.md) - architecture, trust boundaries, application layers, and deployment model
- [Match Lifecycle](docs/match-lifecycle.md) - reasoning across upcoming, live, finished, and post-match states
- [Reliability & Resilience](docs/reliability.md) - graceful degradation, data integrity, caching principles, and recovery
- [Engineering Decisions](docs/engineering-decisions.md) - important architectural choices and trade-offs
- [Security & Documentation Boundary](docs/security-boundary.md) - the line between useful public design documentation and sensitive operational detail

The documents intentionally describe **patterns and decisions rather than production recipes**. Provider mappings, protected request contracts, authentication internals, exact thresholds, privileged routes, production identifiers, and detailed abuse/monitoring controls are not published.

---

## Match lifecycle

NINETY models the fixture as a product journey rather than a static page. Upcoming, live, full-time and post-match states each have their own UI and recovery behavior.

<p align="center">
  <img src="docs/diagrams/match-lifecycle.svg" alt="NINETY match lifecycle from upcoming through live, full time and highlights" width="100%" />
</p>

The lifecycle layer does not trust one upstream flag blindly. It combines fixture timing, usable-source availability, verified terminal states and local safeguards so stale external data does not leave a finished match stuck in Live.

---

## High-level architecture

This is the public HLD view of NINETY. It shows the major trust boundaries and application layers without exposing private provider mappings, credentials, internal identifiers or privileged operational details.

\`\`\`mermaid
flowchart LR
    A["⚽ Matchday UI<br/>Discovery · Watch · Match center"] --> B["☁️ Edge Application<br/>Access · Routing · Caching"]
    B --> C["⚙️ Match Services<br/>Lifecycle · Normalize · Resilience"]
    C --> D["◌ External Services<br/>Match data · Content"]

    classDef client fill:#10212d,stroke:#38d9f5,color:#f7fbff,stroke-width:2px;
    classDef edge fill:#15251b,stroke:#f48120,color:#f7fbff,stroke-width:2px;
    classDef service fill:#111e2b,stroke:#7a9cff,color:#f7fbff,stroke-width:2px;
    classDef external fill:#282315,stroke:#ffd65a,color:#f7fbff,stroke-width:2px;
    class A client;
    class B edge;
    class C service;
    class D external;
\`\`\`

The diagram deliberately abstracts external integrations behind server-side adapters. The browser receives normalized application data rather than provider credentials or private integration details.

### Design principles

- **Server-side provider access** - external service calls and credentials stay away from client code.
- **Graceful degradation** - a metadata outage should not automatically break the rest of the match page.
- **Explicit lifecycle rules** - live and ended states are not based on a single unreliable signal.
- **Demand-driven data** - expensive data such as lineups is requested only when the user opens it.
- **Defensive caching** - live information uses shorter caching while stable post-match information can be retained longer.
- **No fabricated sports data** - missing scores, lineups, or events remain unavailable rather than being guessed.

---

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19, TypeScript |
| Application framework | Vinext / Vite |
| Runtime | Cloudflare Workers |
| Styling | Application-level responsive CSS |
| UI primitives | Base UI, Radix-compatible components |
| Persistence | Cloudflare edge primitives |
| Validation | Zod |
| Testing | Node test runner + targeted integration tests |
| Package manager | pnpm |


---

## Local development

### Requirements

- Node.js 22.13+
- pnpm 11

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Run the development server:

```bash
pnpm dev
```

Create a production build:

```bash
pnpm build
```

Run the focused automated tests:

```bash
node --test tests/*.test.mjs
```

---

## Reliability and safety

NINETY assumes that external services can be delayed, incomplete, rate-limited, stale, or temporarily unavailable.

Examples of defensive behavior include:

- cached responses to reduce unnecessary upstream requests
- live-data polling only while relevant UI is active
- browser-visibility awareness
- lifecycle fallbacks for stale match status
- verified-score fallback rather than fabricated results
- complete starting XI requirement before rendering lineups
- source rejection and replacement checks when a user identifies an incorrect broadcast
- graceful unavailable states instead of broken player surfaces


---

## Current focus

The project is actively evolving around:

- more resilient match-state detection
- improved live-event availability
- better source-quality recovery
- richer post-match presentation
- mobile polish
- owner-only operational tooling kept separate from public-facing product documentation

---

## License

**All rights reserved.**

No open-source license is granted unless a separate license file explicitly states otherwise.
