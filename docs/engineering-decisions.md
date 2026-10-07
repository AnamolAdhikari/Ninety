# Engineering Decisions

This document records selected architectural decisions that are useful for understanding NINETY as an engineering project. Operational configuration and security-sensitive implementation details are intentionally excluded.

## 1. Model match lifecycle explicitly

**Decision:** Treat upcoming, live, finished, and post-match as application states.

**Why:** Upstream status can be stale or inconsistent. A dedicated lifecycle layer prevents every component from inventing its own interpretation.

**Trade-off:** More application policy to maintain, but substantially more predictable UI behavior.

## 2. Keep integrations behind a server-side boundary

**Decision:** Browser-facing components consume normalized application data instead of directly owning privileged external integrations.

**Why:** Protected configuration does not belong in browser code; upstream response formats should not leak throughout the UI; integrations can change without forcing a product-wide rewrite; validation and failure mapping gain one natural boundary.

**Trade-off:** Additional server-side translation code.

## 3. Degrade capabilities independently

**Decision:** Avoid making every match-page feature depend on every external capability succeeding.

**Why:** A partial outage should produce a partial degradation, not necessarily a blank page.

**Trade-off:** More explicit loading and unavailable states.

## 4. Load detailed information on demand

**Decision:** Fetch certain detailed match information only when the user opens the relevant experience.

**Why:** This improves initial efficiency, reduces unnecessary external requests, limits dependency pressure, and makes expensive work correspond to actual user intent.

**Trade-off:** The first opening of a detail view can have its own loading state.

## 5. Prefer verified absence over fabricated completeness

**Decision:** Never fill gaps by guessing sports data.

**Why:** A polished incorrect score or lineup is worse than a clear unavailable state.

**Trade-off:** The UI occasionally shows less information, but maintains trust.

## 6. Treat mobile as a first-class product surface

**Decision:** Responsive behavior is designed rather than treated as a final CSS pass.

**Why:** Match discovery and live-following are naturally mobile-heavy workflows.

**Trade-off:** Components require deliberate behavior across multiple viewport and interaction patterns.

## 7. Optimize around volatility

**Decision:** Cache and refresh behavior varies conceptually with how quickly information changes.

**Why:** Fixture discovery, live events, and completed-match information do not have the same freshness requirements.

**Trade-off:** More nuanced caching policy than a single global duration.

## 8. Keep public architecture intentionally incomplete

**Decision:** Publish enough design information to demonstrate engineering judgment, but not enough operational detail to make the repository a guide to the deployed attack surface.

Public material includes component responsibilities, trust boundaries, failure philosophy, lifecycle concepts, high-level data flow, and trade-offs.

Private material includes provider mappings, protected request contracts, credentials, authentication internals, exact thresholds, production identifiers, privileged routes, abuse controls, monitoring implementation, and detailed source-selection behavior.

Good technical communication includes knowing what not to publish.
