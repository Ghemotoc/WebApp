# CMS-1d plan: seasonal doodles and the two epic checks

Stories: S1-E11-11 (seasonal doodle schedule, issue #109), S1-E5-07 (seasonal doodles, #52), S1-E5-QA part two (#55), S1-E11-QA (find its issue).

## Choices for the two OPEN points (S1-E5-07, S1-E11-11)

- Occasions are the same in every country for now (Romania is the only open market). A `country_code` column (null = every market) is there so per-country occasions need no new table later.
- The website home page doesn't show seasonal doodles yet; only Discover and Search (the board). Noted as a follow-up.
- No religious or political occasion is on by default (story's legal note). Seeded: the four seasons as defaults plus the Halloween week (jack-o'-lantern), all editable.

## Doodles available

The approved set in `design/assets/` has no snowman or Christmas tree (the board mentions them). Winter uses hot chocolate; autumn the autumn leaf; Halloween the jack-o'-lantern and the friendly ghost; spring the cherry blossom, daisy and butterfly; summer the sunny face and kite. New SVGs (snowman, Christmas tree) go in a normal release: added to the by-hand list for Robert.

Copy the chosen SVGs into `src/assets/doodles/` (as the existing ones), with tokens for colours where the existing ones do.

## Database (`…_s1_e11_11_seasonal_occasions.sql`)

- `seasonal_occasions`: name_ro, name_en, starts_on and ends_on (month-day when `every_year`, else full dates), every_year, doodle (text, checked against a list of known doodle names in a check function the app shares through a zod enum), shows_on (discover, search, both), is_season_default, country_code null, user_id (admin who saved), timestamps, deleted_at. Kind `staff`.
- RLS: select for website_cms staff; public read only via `current_occasion(on_date date, place text)` (security definer, granted to anon and authenticated): the shortest active occasion for that place, else the season default. The date is the reader's device date, sent by the app (story: device date, no location).
- `admin_save_occasion()`, `admin_remove_occasion()`: website_cms act, audit log `seasonal.saved`, `seasonal.removed`.
- pgTAP 174: allowed/denied policy, overlap (shorter wins), year wrap (Dec to Feb), season default, every year vs one year, refusals (moderator), audit.

## App

- `src/features/seasonal/`: `useCurrentOccasion(place)` (TanStack Query, 60 s stale time so changes show within a minute), `SeasonalDoodle` (decorative SVG, `aria-hidden`, `data-doodle="widget"`, no motion), the doodle registry (name → imported SVG).
- Discover: the doodle beside the greeting (board 3.1). Search: a hook the search screen uses when DISCOVER-2 builds it.
- Staff › Website › Seasonal doodles: list and a year view (12 months, each occasion as a bar, gaps marked), an add/edit form (names ro and en, dates, every year, doodle picker of the approved set with light and night previews, where it shows), remove. Plain components (staff screens have no doodles except the picker previews, which are the content being chosen).

## Epic checks

- S1-E5-QA part two: extend `e2e/epic-s1-e5.spec.ts`: visitor home page (CMS copy) → Discover → category and tag → sort → See all → writer profile, with the seasonal doodle present and decorative; minors' personas see no 16+ stories.
- S1-E11-QA: extend `e2e/epic-s1-e11.spec.ts` with the CMS journeys from the story (home page in Română with a future date, notice and question going live, a visitor from a country with no page sees Romania in English, a button label overridden and reset, moderator and content editor refused everywhere). Epic report in the PR.

## Then

CMS-1e: tags (recommended, approval, names per language with recognition, rank badges).
