# NINETY owner login

The Worker now requires authentication before serving pages, static assets or API routes. Missing credentials fail closed with a setup message.

In Cloudflare > Workers & Pages > live > Settings > Variables and Secrets, add these as Secret:

- NINETY_USERNAME: your chosen username.
- NINETY_PASSWORD: a unique long password (use your password manager).
- NINETY_SESSION_SECRET: a cryptographically random secret of at least 32 characters (generate a 64-character password in your password manager).

Save/deploy changes. Never put these values in GitHub or chat. The build supplies LOGIN_RATE_LIMITER (namespace 90002), five login attempts per minute per IP per Cloudflare location. Confirm the binding appears after deployment. All assets must run the Worker first; this is configured in Vite.

Sessions expire after 12 hours; Secure/HttpOnly/SameSite=Strict cookies hold signed tokens, not credentials. Changing username, password or session secret invalidates existing sessions. Sign out clears this browser session; a copied session remains valid until expiry or credential rotation. There is no public signup or friend access.

Test in a private browser: home redirects to login; API requests return 401; wrong password fails; your login works; logout blocks access again. Missing secrets return 503 even on API routes. Do not enable caching rules that bypass the Worker.

Cloudflare Access can additionally protect this Worker, but is optional for this built-in login. Authentication does not conceal provider iframe addresses from the authenticated browser or restrict access at the provider.
