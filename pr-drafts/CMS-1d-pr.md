<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #109
Closes #52
Closes #55
Closes #116

This is part (d) of the CMS-1 bundle in Robert's full-app plan (30 Oct 2026): the seasonal doodle schedule (S1-E11-11), the doodle beside Discover's heading (S1-E5-07), and the two epic checks that were waiting for the website CMS (S1-E5-QA part two, S1-E11-QA). Parts (a) to (c) merged as #210, #211 and #212. Part (e), tags, comes next.

## What changed

### Database (`…100006_s1_e11_11_seasonal_occasions.sql`)

- **`seasonal_occasions`** (kind `platform`, RLS on): a name in Romanian and English, the first and last day, every year or once, the doodle (enum `seasonal_doodle`, the 14 approved drawings), where it shows (Discover, Search or both), whether it is a season's default, and the admin who saved it. Owner and admin read it (`seasonal_occasions_select_admin`); nobody writes it directly.
- **`current_seasonal_doodle(on_date, place)`**, granted to visitors and members: the doodle for that day and place. A special day beats its season, and a shorter occasion beats a longer one, so the Halloween week wins over Autumn. A yearly range may wrap the new year (December to February).
- **`admin_save_occasion()` and `admin_remove_occasion()`** check the `website_cms` area (owner and admin) and write `seasonal.saved` or `seasonal.removed` to the audit log in the same transaction. A save is refused, with the field named, when a name is empty or too long, a day is missing, the last day is before the first, or a yearly range is a year or more.
- **Seeded:** the four seasons as defaults (cherry blossom, sunny face, autumn leaf, hot chocolate), Children's Day on 1 June (kite) and the Halloween week (jack-o'-lantern). No religious or political occasion is on by default (the story's legal note).

### App

- **Discover:** `SeasonalDoodle` beside the heading. It is decorative (`alt=""`, `aria-hidden`, a widget doodle that never touches the heading), read again every minute, and shows nothing if the read fails.
- **Staff › Website › Seasonal doodles** (`/staff/website/seasonal`): the list with Change and Remove, an Add form with a doodle picker (each drawing on a light and a night tile), and a year view with every month's occasions and any days with no doodle.
- Eleven approved SVGs from `design/assets/` copied into `src/assets/doodles/`.

### Epic checks

- **S1-E5-QA part two:** journey 6 in `e2e/epic-s1-e5.spec.ts`. A visitor goes from the public home page through "Start reading" to Discover, sees today's doodle (decorative), then opens Fiction and a story.
- **S1-E11-QA:** journeys 2 to 4 in `e2e/epic-s1-e11.spec.ts`:
  - a home page line with tomorrow's date waits, then goes live on the day;
  - a notice shows to visitors;
  - a US visitor with a Romanian interface gets the Romanian market's English page;
  - an interface text override shows and Reset removes it;
  - a moderator and a content editor are refused on all six Website tabs.
- The epic reports `docs/epic-reports/S1-E5.md` and `S1-E11.md` are updated.

## Choices on two OPEN points

- Occasions are the same in every market for now; Romania is the only open market. Per-country occasions would add a column later.
- The website's home page shows no seasonal doodle yet, only Discover. Search gets it when DISCOVER-2 builds the search screen (the place `search` already works).

## How it was tested

- pgTAP `174-seasonal-occasions` (20 tests): the allowed and denied policy tests, a shorter occasion wins, the year wrap, every year and once, each refusal, the audit rows, a moderator refused. `021` and `003` cover the new table.
- Vitest: `seasonalCalendar.test.ts` (the same coverage rule as the database).
- Playwright: `e2e/seasonal-doodles.spec.ts` (16 tests, axe at 390, 768 and 1440 px, light and night, ro and en), the two epic checks.
- The full local check run: see the comment below.

## Follow-ups

- Snowman and Christmas tree doodles: the board mentions them but the approved set has neither (by-hand list for Robert).
- Seasonal doodles on the website's home page (OPEN).

## By hand

Nothing on staging. After the merge, Robert can open Staff › Website › Seasonal doodles and read the new Romanian lines in `websiteAdmin.json`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
