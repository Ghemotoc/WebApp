<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #35

This is part (b) of the READ-4 bundle in Robert's full-app plan: S1-E4-02, reading settings.

## What changed

- **Database** (`20261102110001_s1_e4_02_reading_settings.sql`):
  - four enums for the board's choices: font (`sans`, `serif`, `dyslexia_friendly`), line spacing, line width and theme (`light`, `sepia`, `night`);
  - `reading_settings`, one row per reader, readable by its owner only. `text_size` is null until the reader picks one, so the size follows the device;
  - `save_reading_settings()` saves the whole set (security definer; refused when signed out; size checked 14 to 28).
- **Reader** (board 3.5):
  - "Reading settings" in the chapter bar for signed-in readers opens the panel: Font (Inter, Serif, Dyslexia-friendly), Text size (14 to 28 px), Line spacing, Line width and Theme (Light, Sepia, Night);
  - every change shows on the text at once and is saved 600 ms after the last one, so dragging the slider saves once;
  - opening moves focus to the panel's heading. Escape or the close button returns focus to the button;
  - the text takes CSS variables (`--reading-font-size` and so on). Sepia and Night wrap it in a rounded page; Night reuses the night tokens through `data-theme="night"`;
  - the width setting changes the column (560, 680 or 780 px, plus the 80 px kept for comment markers).
- **The device's text size:**
  - until the reader picks a size, the default 19 px grows with the page's root font size, which browsers and phones raise when the person asks for larger text;
  - the slider says "19 px, from your device", and "Use my device's size" brings it back.
- The panel is loaded only when it is first opened (`React.lazy`), so the reader stays under its 40 KB script budget.
- `ChoiceChips` can show its label as an eyebrow (`isLabelEyebrow`), as the board draws the panel's section labels.
- Locales: `settings.*` in `reading.json` (en and ro).
- Docs:
  - `docs/code-tour.md` has a new "Reading settings" section;
  - `docs/retention.md` has a new row;
  - `docs/board-fixes.md` has 4 rows;
  - the reading feature's README is updated.

## Board mismatches (in docs/board-fixes.md)

- The "Later, in the apps: any font on your device" block is left out until the apps exist.
- The fonts use the shared ChoiceChips with plain labels, not radios drawn in each typeface.
- The size label says when it comes from the device, and there is a way back to the device's size.
- Only signed-in readers get the button, because the settings are saved to the account.

## How it was tested

- `supabase/tests/database/180-reading-settings.test.sql` (9 checks):
  - allowed and denied tests for `reading_settings_select_own`;
  - a signed-out visitor is refused;
  - the first save creates the row, a later save replaces it, and null means "follow the device";
  - a size of 40 is refused, and the table can't be written directly.
- `021-signed-out-reads` now lists the table (0 rows for a visitor).
- `src/features/reading/lib/readingStyle.test.ts`: the device size, the slider's range, each setting's CSS value and the column width.
- `e2e/reading-settings.spec.ts` (5 tests):
  - each setting changes the text at once, and the settings are saved and found again in a fresh browser;
  - with the root font at 20 px the text starts at 24 px, a chosen 16 px wins, and "Use my device's size" brings back 24 px;
  - Escape closes the panel and returns focus to the button, and a visitor has no button;
  - axe passes with the panel open in the night theme at 390 px in ro and en, and nothing scrolls sideways at 320 px.

## Local check run

Fast checks for this part (Robert, 30 Oct: the full e2e suite runs once at the end of the READ-4 bundle):

- lint, typecheck and types:check: pass
- unit tests: 731 passed (118 files)
- db reset and test db: PASS (90 files, 1,912 tests)
- i18n:check and migrations:check: pass
- functions build: compiled
- e2e for this part and the screens it touches:
  - specs: reading-settings, chapter-reader, teaser, copy-protection, epic-s1-e4, library, reader-performance, publish, story-settings, ratings, discover and comments;
  - result: 110 passed.
- reader-performance's 40 KB script budget failed at first (44 KB). Loading the panel on first open fixed it, and the budget, the 200% zoom check and reading-settings passed again (7 of 7).
- reader-performance's throttled cold load is about 2.4 s on this machine. That is known on main (2.3 s), and nothing in this part runs before the first paragraph.

## Follow-ups

- The board names Atkinson Hyperlegible and OpenDyslexic for the apps. Atkinson Hyperlegible (OFL) could be self-hosted for the web too, if Robert wants it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
