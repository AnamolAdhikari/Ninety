# System Design

## Purpose

NINETY is a responsive football matchday application designed around a changing fixture lifecycle. The product brings match discovery, match-state awareness, match-center information, user preferences, and authorized playback experiences into one interface.

The main engineering challenge is maintaining a coherent user experience while upstream information can be delayed, incomplete, stale, unavailable, or contradictory.

## Design goals

1. Keep the browser-facing product simple even when integrations are not.
2. Keep privileged integration work behind server-side boundaries.
3. Avoid treating any single external signal as universally authoritative.
4. Allow one degraded capability to fail without unnecessarily breaking unrelated capabilities.
5. Fetch expensive or volatile information only when it is useful.
6. Never manufacture sports data to fill a missing upstream response.
7. Keep the deployment edge-friendly and responsive across desktop and mobile.

## High-level architecture

Browser
  -> Discovery UI / Match Page / Match Center / Preferences
  -> normalized application data
  -> NINETY application boundary
     - request handling
     - lifecycle policy
     - validation and normalization
     - cache policy
     - failure mapping
     - integration adapters
  -> abstract external capabilities

External systems are intentionally represented generically. The public design does not identify private provider mappings or describe protected request contracts.

## Browser layer

The browser owns presentation and user interaction: fixture discovery and filtering, responsive views, countdown/lifecycle presentation, match-center tabs, saved preferences, user-triggered actions, and clear loading/unavailable/offline/completed states.

The UI receives application-shaped information rather than needing to understand every upstream service.

## Application boundary

The server-side application layer acts as a translation and protection boundary between the product and external dependencies. Its responsibilities include validating inputs, normalizing external data, applying lifecycle policy, applying cache behavior, mapping failures into stable application states, keeping privileged configuration away from browser code, and coordinating optional capabilities without making them hard dependencies of the whole page.

## Capability isolation

NINETY treats major match-page capabilities as independently degradable. Temporary unavailability of detailed match information should not automatically make fixture discovery unusable. A missing optional capability should produce a clear unavailable state rather than fabricated content or an uncaught error.

## Demand-driven information

Stable discovery information can be loaded early. More detailed information can be requested when the user expresses intent, such as opening a particular match-center view. This reduces unnecessary upstream requests, dependency pressure, initial latency, and the number of services in the critical render path.

## Deployment model

NINETY is designed for an edge-oriented web runtime. Application rendering, server-side request handling, validation/normalization, caching/persistence primitives, and the external integration boundary sit behind the deployed application edge.

## Trust boundaries

### Public browser
Assume browser-visible code and requests can be inspected. No security decision should depend on hiding client-side implementation.

### Application runtime
Responsible for validation, normalization, policy enforcement, and access to protected configuration.

### External systems
Treated as untrusted dependencies from a reliability perspective. Responses can be incomplete, delayed, stale, malformed, rate-limited, or unavailable.

## Intentionally excluded

This public HLD does not publish provider identities or mappings, private endpoint inventories, protected request recipes, credential or secret names, authentication/session implementation, production storage identifiers, exact cache/retry/polling/lifecycle thresholds, source ranking or replacement algorithms, privileged administrative capabilities, monitoring implementation, or abuse-control details.
