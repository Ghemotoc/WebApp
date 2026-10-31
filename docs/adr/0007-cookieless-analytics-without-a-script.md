# ADR 0007: Cookieless analytics as plain event requests, off until a provider is chosen

- **Date:** 31 October 2026
- **Status:** Proposed by the builder (READ-4f, S1-E15-01). The provider is OPEN (Q49): Robert picks it at GO-LIVE.

## Decision
The app sends analytics events through one small adapter, `src/lib/analytics/track.ts`. It loads no script from the provider and sets no cookie or storage. Each event is one `fetch` without credentials to the provider's events address.

- **Off by default.** Nothing is sent unless the build variables `VITE_ANALYTICS_PROVIDER` (`plausible` or `umami`), `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_SITE` are all set. Local development, the tests and staging send nothing.
- **Only catalogued events.** `trackEvent()` accepts only names and properties from `src/lib/analytics/catalogue.ts`, which must match `docs/analytics-events.md` (a unit test fails the build otherwise, S1-E15-03).
- **No page views and no addresses.** Every event is reported against the site's root, so a URL holding a username or a story never leaves the browser.
- **No personal data in properties.** No user ID, handle, email, IP address, story or chapter ID, or user text. Values are small fixed sets.
- **The browser's no wins.** Nothing is sent while Do Not Track or Global Privacy Control is on.

## Why
- CLAUDE.md rule 7: no tracking and no third-party scripts or cookies without an ADR. A request without a script or a cookie adds no code from someone else to our pages, and no consent banner is needed for it.
- Both candidates (Plausible, Umami Cloud) are cookieless and EU-hosted, and both take events over a plain HTTP API, so one adapter covers either. Choosing between them stays with Robert (Q49; CLAUDE.md rule 13).
- The March numbers come from our own database (S1-E15-02), so the product works fully with analytics off.

## Consequences
- GO-LIVE: choose the provider, sign its data processing agreement, add it to the processor list and the privacy notice, then set the three build variables in Cloudflare and redeploy.
- The provider's own visitor count from page views isn't available, by design.
- A new event means a row in `docs/analytics-events.md` and a line in `catalogue.ts` in the same pull request.
