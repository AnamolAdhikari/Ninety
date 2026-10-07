<div align="center">

# NINETY

### A modern football matchday experience built for the web

Live and upcoming fixtures, match events, lineups, saved matches, reminders, and resilient matchday states in one responsive experience.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)
![Status](https://img.shields.io/badge/status-active-brightgreen)

</div>

## About

**NINETY** is a personal football matchday project built around the full fixture journey: **upcoming → live → finished**. The interface adapts as a match changes state and is designed to remain useful when external data is delayed, incomplete, or unavailable.

The project emphasizes responsive UX, explicit lifecycle handling, graceful degradation, demand-driven data loading, and verified sports data rather than fabricated fallbacks.

## Highlights

- Live, Today, Upcoming, Favorites, and personal matchday views
- Featured fixtures, search, saved matches, preferred teams, and reminders
- Upcoming-match countdown and dedicated live/finished experiences
- Match events and confirmed lineups when available
- Responsive desktop and mobile UI
- Lifecycle safeguards for stale or incomplete match state
- Graceful unavailable states and recovery behavior
- Post-match results and highlights discovery

## Architecture

NINETY keeps the browser-facing experience simple while server-side application services handle integration, lifecycle reconciliation, caching, and resilience. External services are intentionally abstracted in this public view.

<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 1200 430" role="img" aria-label="NINETY high-level architecture">
  <rect width="1200" height="430" rx="24" fill="#081119"/>
  <text x="48" y="55" fill="#f4f8fb" font-family="Arial,sans-serif" font-size="26" font-weight="700">NINETY · High-Level Architecture</text>
  <text x="48" y="82" fill="#7891a6" font-family="Arial,sans-serif" font-size="14">Public view · sensitive provider and operational details intentionally abstracted</text>
  <g font-family="Arial,sans-serif">
    <rect x="48" y="125" width="235" height="160" rx="18" fill="#0e1a24" stroke="#24465b"/>
    <text x="74" y="163" fill="#c9ff22" font-size="13" font-weight="700">CLIENT</text>
    <text x="74" y="198" fill="#f4f8fb" font-size="21" font-weight="700">Matchday UI</text>
    <text x="74" y="229" fill="#8ba0b1" font-size="14">Discovery · Watch · Match center</text>
    <text x="74" y="253" fill="#8ba0b1" font-size="14">Responsive web experience</text>

    <path d="M303 205H355" stroke="#31d7f4" stroke-width="3"/>
    <path d="M345 197l10 8-10 8" fill="none" stroke="#31d7f4" stroke-width="3"/>

    <rect x="375" y="125" width="235" height="160" rx="18" fill="#0e1a24" stroke="#31533d"/>
    <text x="401" y="163" fill="#f48120" font-size="13" font-weight="700">EDGE</text>
    <text x="401" y="198" fill="#f4f8fb" font-size="21" font-weight="700">Application Boundary</text>
    <text x="401" y="229" fill="#8ba0b1" font-size="14">Access · Routing · Caching</text>
    <text x="401" y="253" fill="#8ba0b1" font-size="14">Response optimization</text>

    <path d="M630 205H682" stroke="#31d7f4" stroke-width="3"/>
    <path d="M672 197l10 8-10 8" fill="none" stroke="#31d7f4" stroke-width="3"/>

    <rect x="702" y="125" width="235" height="160" rx="18" fill="#0e1a24" stroke="#294c65"/>
    <text x="728" y="163" fill="#55e5ff" font-size="13" font-weight="700">SERVICES</text>
    <text x="728" y="198" fill="#f4f8fb" font-size="21" font-weight="700">Match Orchestration</text>
    <text x="728" y="229" fill="#8ba0b1" font-size="14">Lifecycle · Match details</text>
    <text x="728" y="253" fill="#8ba0b1" font-size="14">Resilience · Normalization</text>

    <path d="M957 205H1009" stroke="#31d7f4" stroke-width="3"/>
    <path d="M999 197l10 8-10 8" fill="none" stroke="#31d7f4" stroke-width="3"/>

    <rect x="1029" y="125" width="123" height="160" rx="18" fill="#0e1a24" stroke="#544728"/>
    <text x="1053" y="163" fill="#ffd65a" font-size="13" font-weight="700">EXTERNAL</text>
    <text x="1053" y="198" fill="#f4f8fb" font-size="18" font-weight="700">Services</text>
    <text x="1053" y="229" fill="#8ba0b1" font-size="13">Match data</text>
    <text x="1053" y="251" fill="#8ba0b1" font-size="13">Content</text>

    <rect x="375" y="320" width="562" height="66" rx="16" fill="#0b1720" stroke="#243b4a"/>
    <text x="401" y="347" fill="#c9ff22" font-size="12" font-weight="700">DESIGN PRINCIPLES</text>
    <text x="401" y="371" fill="#aebfcb" font-size="13">Lifecycle-aware · Demand-driven · Graceful degradation · No fabricated match data</text>
  </g>
</svg>

> The public architecture intentionally omits provider identities, credentials, request contracts, exact thresholds, privileged routes, production identifiers, and operational security details.

## Engineering Notes

For readers who want the deeper engineering reasoning:

- [System Design](docs/system-design.md)
- [Match Lifecycle](docs/match-lifecycle.md)
- [Reliability & Resilience](docs/reliability.md)
- [Engineering Decisions](docs/engineering-decisions.md)
- [Security & Documentation Boundary](docs/security-boundary.md)

## Tech Stack

| Area | Technology |
| --- | --- |
| UI | React 19, TypeScript |
| Framework | Vinext / Vite |
| Runtime | Cloudflare Workers |
| Validation | Zod |
| Testing | Node test runner + targeted integration tests |
| Package manager | pnpm |

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Production credentials, API keys, provider mappings, private infrastructure identifiers, and privileged operational details are intentionally not documented in this public repository.

## Status

NINETY is an active personal engineering project focused on match-state reliability, live-event UX, post-match presentation, and mobile polish.

## License

**All rights reserved.**

Third-party sports data, logos, broadcasts, and media remain subject to their respective rights and terms.
