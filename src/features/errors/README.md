# Errors

Our own simple error log, and the page shown when a page fails to draw. Built by S1-E1-05 (decided 18 Oct 2026, 10:46: our own log in our own database, no outside service; Sentry may come later).

- `lib/installGlobalErrorHandlers.ts`: started by `src/main.tsx`; reports errors nothing caught and promises that failed without a `.catch`.
- `components/ErrorPage.tsx`: the router's error element (board 7.4, card 4): "Something went wrong on our side", Try again, Go to Home, Contact us, and the code to quote.
- `lib/errorReporter.ts`: the one way to report. At most 5 reports per page load, never the same error twice (a repeat gets the first code). It never throws.
- `lib/buildErrorReport.ts`: keeps only the error's name, a scrubbed message, the route pattern, the app version and the browser family.
- `lib/scrubErrorText.ts`, `lib/routePattern.ts`, `lib/browserFamily.ts`: how each field is made safe. The database scrubs again (`public.scrub_error_text`, `public.scrub_route_path`).
- `lib/currentRoute.ts` and `hooks/useTrackRoutePattern.ts`: remember the page on screen as a pattern such as `/join/:code`, never the address.
- `api/clientErrors.ts`: calls `report_client_error()`; the table is `public.client_errors` (no user ID, email, IP or user text; kept 30 days).

Owner and admin read the log with `select * from public.admin_list_client_errors();` until the admin site (S1-E11-01) gives it a screen.
