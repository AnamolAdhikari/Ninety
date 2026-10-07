# Match Lifecycle Design

## Why lifecycle logic exists

A football fixture is not a static object. From the user's perspective it moves through meaningful product states:

DISCOVERABLE -> UPCOMING -> LIVE -> FINISHED -> POST-MATCH

External systems do not always transition between those states at exactly the same time. NINETY therefore models lifecycle as application policy rather than blindly mirroring one flag.

## Upcoming

Before kickoff, the interface prioritizes local kickoff time, countdown, save/reminder actions, warm-up presentation, and a clear indication that live-only capabilities are not expected yet.

An upcoming match should not look broken simply because live-only information does not exist.

## Live

A match enters the live experience only when the application has enough evidence to present it as active.

During this phase NINETY prioritizes match visibility, current match-center information when available, user-friendly recovery states, efficient background work, and preserving useful parts of the experience if another capability degrades.

No single external status is assumed to remain perfectly fresh.

## Finished

Explicit terminal information is preferred when available. The lifecycle layer also includes defensive safeguards so stale upstream state cannot leave an old fixture appearing live indefinitely.

Exact thresholds and precedence rules are intentionally not documented publicly.

## Post-match

Once a match is considered complete, the product changes purpose. The experience can shift toward verified final-result information, final event timelines, confirmed lineup information, highlights discovery, and a clear finished-match presentation.

Live-only surfaces are removed rather than leaving a dead viewing area in the interface.

## Conflicting information

A core design principle is evidence reconciliation. NINETY can receive signals that disagree. Instead of exposing that disagreement directly, the lifecycle layer applies a conservative policy using categories of evidence such as explicit terminal evidence, activity evidence, timing, and availability.

The exact decision table remains private because it contains operational tuning rather than information required to understand the architecture.

## Why this matters

Without a lifecycle layer, completed matches can remain in Live, future matches can look broken, stale metadata can override stronger current evidence, post-match information can become unreachable, and one delayed integration can create contradictory UI.

The lifecycle model converts those integration problems into predictable product states.
