# Public Documentation & Security Boundary

## Goal

NINETY is a public portfolio project. Its documentation should demonstrate system-design thinking without unnecessarily exposing the operational shape of the deployed application.

Security does not come from documentation secrecy alone, but public documentation also does not need to provide a curated inventory of sensitive implementation details.

## Safe to document publicly

- product capabilities
- technology choices
- high-level component boundaries
- generic data flow
- lifecycle concepts
- graceful-degradation strategy
- validation as a design principle
- caching as a design principle
- demand-driven loading
- broad deployment model
- engineering trade-offs

## Keep private

- credentials, tokens, keys, or example secrets
- secret/environment variable names where they reveal integration structure
- provider identities when not required for attribution
- provider-specific identifiers or mappings
- protected request and response formats
- exact production endpoint inventory
- authentication and session internals
- production storage/binding identifiers
- exact retry, polling, timeout, cache, or lifecycle thresholds
- source ranking, rejection, replacement, or fallback algorithms
- privileged administrative routes or capabilities
- rate-limit and abuse-control thresholds
- telemetry schemas and internal monitoring details
- infrastructure account or deployment identifiers

## Screenshots

Public screenshots should show the product, not the operator environment.

Before publishing, check that an image does not expose browser profile/account information, developer tools, request URLs or headers, tokens or cookies, admin/control surfaces, private deployment URLs, provider identities that are intentionally abstracted, credentials/login details, or third-party media you do not have permission to redistribute.

A good portfolio screenshot should be understandable even if everything outside the application viewport is cropped away.

## Design-review rule

Before adding a public design document, ask:

> Does this help another engineer understand the design, or does it mainly help someone reproduce or probe the production implementation?

If it is primarily the second, keep it private.
