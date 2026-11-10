<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle LOOK-2 of the design catch-up (`builder/look-closer-to-boards-brief.md`): the home page's hero, value cards and safety row, closer to board Website-Home. Robert gave the go on 6 Nov 2026, 06:43 UTC, with design gap question D1 (leave the reader comment card out). Part of story S1-E5-08, which is updated to match.

## What changed

- **Cover wall** (`HeroCollage.tsx`), beside the headline, wrapping under it on narrow screens:
  - up to six covers from the public Trending list, in three staggered columns tilted by 3 degrees. It reuses the Trending shelf's request, so the browser asks once;
  - only All ages and 13+ stories, whoever is looking, because it is the site's first picture (`lib/wallStories.ts`). With no such stories the wall shows only the card; nothing is invented;
  - one picture for screen readers, named by the titles (`website.coverWall`, ro and en);
  - the open-book and jar-lantern doodles, decorative and checked for overlaps;
  - at most 600 px wide, so on a tablet the covers don't fill the screen.
- **The gold "Your rights" card:** its words come only from the CMS, as a new optional `rightsCard` on the home page (small label, title, line; 30, 60 and 60 characters).
  - The staff Home page editor shows the three fields. Leaving all three empty hides the card; once one has words, all three are needed.
  - Migration `20270202100001_look2_01_home_rights_card.sql` adds the check to `cms_home_page_problems()` and gives version 1 (ro and en) the board's words. It never touches a version an admin saved. Staging gets it with the migration, so nothing to run by hand.
- **Hero icons:** the pen on "Start writing" (in a pale circle) and the open book on "Start reading"; the padlock, shield and book beside the three points.
- **"Why write here"** is one joined white card with thin dividers: four columns on desktops, two on tablets, one on phones. Each has its doodle (padlock, cloud and moon, shield with a heart, two chat bubbles).
- **Safety** becomes the board's quiet row under that card: two lines with small icons and a link to the questions, worded with the CMS safety heading. The link shows only when the page has questions; the row is a list named by that heading either way.
- **Drawn covers** get a `wall` size whose title follows the screen width, as on the board (`clamp(15px, 1.5vw, 20px)`), never below the 11 px floor. At the `card` size, phone covers clipped their titles.
- **Assets:** four doodles and the book icon copied from `design/assets/` as SVG files.
- **Docs:** S1-E5-08 (an Updated line and a criterion), `docs/decisions.md`, `docs/board-fixes.md` (no comment card; the 5:8 cover shape; the 600 px cap) and `docs/code-tour.md`.

**Left out on purpose:** the reader comment card (D1; S1-E5-13, parked) and the board's "Your rights" top-bar link.

## Tests

- `supabase/tests/database/301-home-rights-card.test.sql` (6): version 1 carries the card in ro and en; the seeded page passes every check; an empty card is fine; a half-written card is refused field by field; a title over 60 characters is too long. No table or policy changes.
- `wallStories.test.ts` (3): 16+ and 18+ are left out; at most six, in Trending order; nothing is invented.
- `DrawnCover.test.tsx`: "on the cover wall follows the screen width but never drops below the 11 px floor".
- `e2e/home-hero.spec.ts` (14):
  - an adult who may read 16+ and 18+ still sees only All ages and 13+ covers on the wall;
  - the gold card shows the CMS words, and the safety link jumps to the questions;
  - at 390, 768 and 1440 px, light and night, ro and en: axe, no sideways scroll, no doodle on text or a control.
- Visual compare of `/` at 1440, 768 and 390 px with demo data: saved in the project files at `builder/look-2-2026-11-06/`.

## Local check run

`npm run checks` on this branch, 6 Nov 2026:

| Check | Result |
|---|---|
| lint (ESLint and Prettier) | pass (0 errors; 6 old max-lines warnings) |
| typecheck, types:check, schema:check | pass |
| Vitest | 245 files, 1529 tests passed |
| db reset and pgTAP | 211 files, 4735 tests passed |
| Playwright e2e | 2401 passed in the full run; 10 failed and 128 did not run, all in 10 specs this branch doesn't touch (birthday, data-requests, epub, forum-quotes, message-settings, picture-reviewers, sanctions, staff-story-history, statements, website-cms). After a fresh `db reset` those 10 specs ran again: 213 of 213 passed |
| i18n:check, migrations:check | pass |

`supabase/schema.sql` is regenerated (`npm run schema:gen`): it was missing LOGS-1's objects since #363.

## Follow-ups

- On phones the gold card covers part of the third column's first cover, as on the board. If it reads as clutter, LOOK-7 could shrink the card under 600 px.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
