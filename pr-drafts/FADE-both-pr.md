<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Robert, 6 Nov 2026, 06:24 and 06:25 UTC, with a screenshot of a shelf scrolled to the middle: "the fading is not really working always on both sides … on the right, it's good, it's faded, but on the left it's not."

## Why it happened

It wasn't a rendering bug. The shelf was built to the 16 Oct rule in the Definition of Done, "fade out on one side at a time, never both". In the middle of a row `chooseFadeSide()` picked only the side the reader last moved towards. After a forward press that was the right, so the left edge was cut off with no fade.

## What changed

- **Each edge now fades while cards are hidden past it.** At the start only the right fades, in the middle both, at the end only the left. The first card is still never faded at rest.
  - `useShelfScroll`: `chooseFadeSide()` became `chooseFadeEdges()`. The "last direction" tracking is gone, because nothing needs it any more.
  - `Shelf`: one mask that can fade both edges.
  - The row carries `data-fade` ("left right", "right", "left" or "none") and `data-fade-width`, so tests and the inspector can read the fade state without parsing the mask.
- **Arrow presses land each card between the two fades.** Robert's 5 Nov rule ("before an item becomes faded, you should have the option of seeing it fully") still holds now that both edges can fade.
  - Forward puts the card that was under the right fade one fade width in from the left.
  - Back puts the card one fade width in from the right.
- **Narrow phones.** Each fade is also capped so the widest card fits between two fades (`fadeWidthFor(clientWidth, widestCard)`, never below 24 px). At 390 px nothing changes (still 72 px). At 320 px each fade is 50 px instead of 59, so a 196 px card stays fully clear.
- **Docs:**
  - the Definition of Done design rule;
  - `docs/decisions.md` (the 16 Oct row, now marked replaced);
  - the S1-E5 story criteria;
  - `docs/code-tour.md`, `src/components/ui/README.md` and the header comments that described a one-side fade.

## Tests

- `Shelf.test.tsx`: `chooseFadeEdges()`, including both edges in the middle whichever way the reader moved.
- `shelfPaging.test.ts`:
  - after a press, the card is clear of both fades, on a wide row, a 358 px phone and a 296 px small phone;
  - the new fade width limits.
- `e2e/shelf-paging.spec.ts`, in a real browser at 1440 and 390 px: only the right fades at the start, both in the middle after a press, only the left at the end, and the shown card is clear of both fades.

## Local check run

Run in the cloud container on this branch (GitHub Actions is blocked by billing):

- Prettier, lint, `tsc -b`, `i18n:check` and `migrations:check`: passed.
- Vitest: 242 files, 1,510 tests passed.
- e2e, every shelf screen, after a database reset with one worker: 154 of 154 passed. That covers shelf-paging, design-page, discover, classics, classics-shelf, home, library, search, writer-profile, epic-s1-e1 and epic-s1-e5.
- The build: passed (the e2e run builds it first).
- Checked by eye: screenshots of /design's long shelf after one forward press at 1440 and 390 px show both edges faded and the card clear of both. They are saved in the project files.

No database, SQL or migration changes, so the database suite is unaffected.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
