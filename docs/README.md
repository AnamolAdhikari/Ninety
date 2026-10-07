# NINETY Engineering Notes

This directory contains the public engineering documentation for NINETY.

The goal is to explain product architecture, important engineering decisions, and the reliability model without publishing operational details that could weaken the deployed application.

## Documents

- [System Design](./system-design.md) - components, trust boundaries, data flow, and deployment model
- [Match Lifecycle](./match-lifecycle.md) - how the product reasons about upcoming, live, and completed fixtures
- [Reliability & Resilience](./reliability.md) - failure isolation, graceful degradation, caching, and recovery
- [Engineering Decisions](./engineering-decisions.md) - selected trade-offs and their reasoning
- [Security & Documentation Boundary](./security-boundary.md) - what is intentionally excluded publicly

## Public-documentation principle

These notes describe architecture, not operational recipes.

Provider identities, private request formats, credentials, secret names, authentication internals, production identifiers, privileged routes, exact thresholds, source-selection rules, monitoring details, and abuse controls are intentionally omitted or generalized.

That boundary is deliberate: a portfolio should demonstrate engineering judgment without becoming a deployment map.
