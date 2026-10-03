# NINETY Playwright security tests

These tests are deliberately locked to Cloudflare feature Preview URLs. They refuse to run against production.

Required:

```bash
NINETY_E2E_BASE_URL=https://feat-telemetry-control-center-auto-live.n90.workers.dev pnpm test:e2e:security
```

Optional friend authorization checks use `NINETY_E2E_FRIEND_USERNAME` and `NINETY_E2E_FRIEND_PASSWORD`. Keep credentials in local environment variables or CI secrets; never commit them.

The first suite verifies invalid-login handling and unauthenticated admin protection. When friend credentials are supplied, it also verifies that authenticated non-owner accounts see a normal 404 for both the admin page and admin API.
