# Owner-only access to NINETY

The application does not store login passwords. Configure Cloudflare Access on the `live` Worker before treating the website as private.

1. Enable Cloudflare Zero Trust on the Free plan if it is not already enabled.
2. Create an **Allow** Access policy named **NINETY Owner Only**, with **Include > Emails > your exact email address**. Do not use Everyone, an entire email domain, or a broader account-members rule.
3. Open **Workers & Pages > live > Access > Protect this Worker behind Access**.
4. Choose **All traffic**, covering production and previews, and select the owner-only policy. Apply Access. Worker-level protection covers all domains and all routes, including APIs and static assets.
5. Review the application's policies in Zero Trust. Remove any other Allow/Bypass policy that would permit others. Set a session duration such as 24 hours.
6. Use one-time email PIN login, or configure Google as an identity provider if you prefer your existing account login. Do not share your password or login codes in chat.
7. Test in a private browser window: the homepage, watch page, and `/api/matches` must require login. Sign in using your allowed email. Test an unlisted email to confirm it cannot enter. Check any hostname-specific Access apps too, because they take precedence over Worker-level protection.

Until these settings are enabled and verified, the Cloudflare deployment remains public. Code publication does not activate Access.

The video provider's iframe URL remains visible to an authorized browser. Authentication protects access to NINETY; it does not make the third-party media URL secret or invalidate copied provider links.

Official guide: https://developers.cloudflare.com/workers/configuration/cloudflare-access/
