<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14f FIXES-1, part b of 2: readable titles on automatic and drawn covers. On 5 Nov 2026 Robert wrote that some automatic covers have no contrast: "there's one that's checkered, has the writing in the same colour in black, and you can't really tell the name of the story". The request has no story issue.

## What was wrong

- On the grid (checkered) design, and on starry and doodles, the title was drawn straight on the pattern. When the grid lines were the title's colour (dark lines on paper with a dark title), the lines ran through the letters.
- On two-tone, the title was coloured for the accent band, but a long title grew above the band onto the background, where it could be the wrong colour.

## What changed

- `titleSurfaceFor()` in `coverDesigns.ts`: every patterned design now puts a solid box behind the title and pen name, so no pattern line crosses them.
  - Plain designs: no box, as before.
  - Dots and waves: a paper box, as the board draws them (unchanged).
  - Two-tone: a box in the band's colour, so a long title stays on the colour it is drawn for.
  - Stripes, grid, starry and doodles: a box in the background colour.
- The title colour is still picked from the box colour, so every background and accent pair reads at 4.5:1 or more (WCAG 2.2 AA).
- This covers every place we draw a cover title: the automatic covers, the drawn-cover picker and previews, cards, shelves and link previews all use the same function.
- The DoD cover rule and `docs/board-fixes.md` (NewStory 4.2) now say so.

## Robert can choose differently

This is the default fix from the request: a solid box behind the title. If you'd rather keep the pattern showing behind the words and only change the text colour, say so and I'll switch it. The trade-off is that the grid lines would still cross the letters, so some pairs would read worse even with the right colour.

## Tests

- `coverDesigns.test.ts` gains two tests:
  - every patterned design, for every background and accent pair (1,296 choices), puts a solid box behind the title, and the box is the colour the title is read against;
  - the case Robert saw (grid, paper background, ink lines) gets a paper box and reads at 4.5:1 or more.
- The existing test that every one of the 1,296 choices reaches 4.5:1 still passes.

## Local check run

Fast checks, run locally on this branch after bringing in main (GitHub Actions is blocked by billing):

- Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Lint: the first run found one `max-depth` error in the new test; the loops are flattened in this commit and ESLint now passes.
- Vitest: 235 files, 1,478 tests passed (the covers tests again after the lint fix: 19 of 19).
- Database (`supabase test db`, after a reset): 200 files, 4,594 tests passed.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (automatic-covers, canva-covers, design-page, discover, story-settings): 80 of 80 passed.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
