# NINETY friend accounts and synced preferences

Deploy commit containing this bundle to the existing `live` Worker. The Wrangler configuration preserves `MatchPresence` and adds the SQLite-backed `NinetyAccounts` Durable Object, binding `NINETY_ACCOUNTS`, and migration `ninety-accounts-v1`. The normal Wrangler deployment provisions this namespace automatically; no D1 database or extra API key is required.

Keep the existing `NINETY_USERNAME`, `NINETY_PASSWORD`, `NINETY_SESSION_SECRET`, optional `NINETY_GUEST_USERNAME`/`NINETY_GUEST_PASSWORD`, `API_FOOTBALL_KEY`, and `LOGIN_RATE_LIMITER` settings.

## Use

1. Sign in with owner credentials, then open `/admin` or the shield in the homepage header.
2. Create a friend username and initial password (minimum 12 characters). Share them privately. The app sends no invitation emails.
3. The friend signs in on the existing login page. A separate account starts with its own saved matches, teams and reminders.
4. Sign in on another device with that same account: favorites, teams, reminders, view preference and last selected sources sync. Offline changes are retained locally and retried on reconnect, focus or the next foreground sync.
5. Disable or reset an account in the dashboard. Existing friend sessions are rejected on their next server request. Re-enabling requires signing in again. Resetting a password preserves the profile.

The existing shared guest login remains one account. Use individual friend accounts for separate profiles. Preferences sync about every minute while the page is visible and when returning to the page. Browser notification permissions remain device-specific; reminders still require NINETY to be open.

Owner and guest pre-existing local preferences migrate into their respective profiles. Passwords for friend accounts are stored as salted PBKDF2-SHA256 hashes; raw passwords are not persisted or returned in account lists. Sessions expire after 12 hours and are bound to an account version so disabling or resetting invalidates them.

## Match page

- “Playback not starting?” contains alternate-source, reload and source-refresh actions.
- A browser-reported iframe load error can try another listed source. A cross-origin player usually does not expose playback failures: no timer assumes that a healthy video is broken. Source availability is not proof of actual playback.
- Lineups require complete confirmed starting XIs. A checked time reflects the provider response fetch, including cache age.
- Match events load on opening their tab and refresh every five minutes for active fixtures. Coverage, freshness and substitutions depend on the existing API-Football plan. Provider errors and empty results remain clearly labelled; predicted lineups and invented scores are never shown.
- The owner dashboard reports aggregate service failures and source retry actions over seven UTC days. It does not collect account viewing histories, IP addresses, or video playback analytics.

## Verification

- `node --test tests/account-storage.test.mjs tests/match-data.test.mjs`
- `./node_modules/.bin/tsc --noEmit`
- `npm run build`
- Run local Wrangler on port 8791 with isolated state and test-only owner/guest credentials (`test-owner` / `test-owner-password`, `test-guest` / `test-guest-password`) and a test-only session secret of 32+ characters, then run `python tests/accounts-integration.py`.

After deployment, verify one friend login in an incognito window, a save appearing on a second device, owner-only access to `/admin`, and a disabled friend being sent back to login on refresh. Check the new Events tab on a covered fixture. A provider plan without coverage should display an unavailable message.
