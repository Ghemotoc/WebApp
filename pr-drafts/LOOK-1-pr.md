<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle LOOK-1 of the design catch-up (`builder/look-closer-to-boards-brief.md`). Robert, 6 Nov 2026, design gap question D3 (drop the plainest automatic cover designs): "yes, so none look empty". Story S1-E3-13 is updated to match.

## What changed

- **Automatic covers** (`src/components/covers/automaticCover.ts`) pick only from the 7 patterned designs: stripes, dots, grid, waves, starry, doodles and two-tone.
  - The 9 flat colours stay in the picker for writers who choose one themselves.
  - The design still comes from the story ID, and two neighbours in a row still differ (`designsForRow()`).
  - The story page, shelves, teaser and link preview all use the same function, so they change together.
- **Demo content:** the 4 drawn covers that used a flat colour now use a pattern: demo-01, demo-36, Floare albastră and The Raven.
  - The other automatic demo stories become patterned through the change above.
  - **Different from the brief, on purpose:** I didn't give every demo story a drawn cover. A drawn cover is never moved to avoid its neighbour, so 56 drawn covers across only 7 patterns would put the same design side by side on shelves. Automatic ones are kept apart by `designsForRow()`.
- **Staging:** part 2a now also updates any demo story whose stored drawn cover differs from its file. The new generated `supabase/staging-topups/look-1-covers.sql` does only that, for a staging database that already ran 2a. It is safe to run twice, refuses production and adds no accounts.
- **Docs:**
  - `docs/decisions.md` (new row);
  - the S1-E3-13 criterion;
  - `docs/code-tour.md`;
  - the demo-stories and staging-topups READMEs.

## Tests

- `automaticCover.test.ts`: "an automatic cover never uses a flat colour, so no card looks empty (D3)". It covers first choices, fall-backs and rows. The spread test now expects all 7 patterns.
- `build-demo-content.test.ts`:
  - no demo story or classic draws a flat colour;
  - the cover update runs only while the stored cover differs;
  - the committed `look-1-covers.sql` matches the files.
- Visual compare: `/discover` at 1440 and 390 px and `/` at 1440 px, with demo data. Saved in the project files at `builder/look-1-2026-11-06/`.

## Local check run

- `npm run lint` (no errors; the max-lines warnings are in files this PR doesn't touch), `npm run typecheck`, Prettier and `npm run i18n:check`: clean.
- `npm test` (Node 24): 244 files, 1,522 tests passed. Script tests: 21 files, 156 tests.
- `npm run demo:build` and `npm run demo:compare-parts`: the parts match the single file. There are now 8 parts, because 2a grew.
- Local database: reset, then 2a, 2b, classic-authors and `look-1-covers.sql` twice. The second run changes nothing, and `flat_drawn_covers` is 0.
- e2e: automatic-covers, discover, home, epic-s1-e3 and epic-s1-e5: 51 passed.

## By hand

- Staging: run `supabase/staging-topups/look-1-covers.sql` in the SQL Editor. The last query should show `flat_drawn_covers` 0.

## Follow-ups

- The grid design's board colours (lilac lines on paper) are the palest of the seven patterns. They're readable but light; LOOK-7 can darken its default accent if it still reads as empty.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
