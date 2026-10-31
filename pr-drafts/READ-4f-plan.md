# READ-4f plan: S1-E15-01 cookieless analytics and S1-E15-03 event catalogue (#134, #136)

The provider is OPEN (Q49: Plausible or Umami Cloud), so it isn't chosen here.
- `src/lib/analytics/track.ts`: one adapter that is off by default. Settings come from `VITE_ANALYTICS_PROVIDER`, `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_SITE`.
  - No script, no cookie and no page views.
  - Events go to the site root.
  - It respects Do Not Track and Global Privacy Control.
- `src/lib/analytics/catalogue.ts`: typed events and properties.
- `catalogue.test.ts`: the code and `docs/analytics-events.md` must match, and every `trackEvent()` call must use a catalogued name.
- Ten events wired: language, sign-up, story created, chapter published or scheduled, report, follows, share and quote card.
- ADR 0007, mocks, code-tour and GO-LIVE.
- S1-E11-04 (staff metrics and the compliance log) moves to 4g.
