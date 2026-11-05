<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14f FIXES-1, part a of 2: scrolling rows move one section at a time. On 5 Nov 2026 Robert reported that the last, half-faded card in a row never showed fully after scrolling (06:53 UTC). At 15:02 UTC he explained what he wants: "before an item becomes faded, you should have the option of seeing it fully … moved like one section at a time". The fix has no story issue.

## What changed

- **Arrows move by whole cards** (`src/components/ui/shelfPaging.ts`, `pageTarget()`). Before, an arrow press moved 80% of the row and then snapped to a card's edge, which could leave the next card under the fade again.
  - **Forward:** the first card the right fade was covering becomes fully visible, clear of the fade. The card before it is part-shown at the left edge.
  - **Back:** the mirror image. The card under the left fade becomes fully visible, and the card after it is part-shown at the right edge.
  - At the end, the last card is fully visible.
  - A card wider than the clear space, on very narrow screens, still moves the row most of a screen.
- **No snapping.** The row no longer snaps to card edges, because snapping pulled each press back under the fade. Swipes, trackpads and the keyboard scroll freely, as before.
- **A narrower fade on phones (builder's proposal).** The fade is still 140 px on wide screens. On narrow screens it is a fifth of the row (72 px on a phone), so a whole card fits clear of it. Robert can ask for 140 px everywhere.
- The one-side fade rule is unchanged.
- `docs/definition-of-done.md` (the side-scrolling rows rule), `src/components/ui/README.md` and `docs/code-tour.md` describe the new behaviour.

## Tests

- `src/components/ui/shelfPaging.test.ts` (7 tests) covers:
  - the fade widths;
  - forward showing the faded card fully, with the card before part-shown;
  - back doing the mirror image;
  - a phone width;
  - never moving past either end;
  - a card wider than the clear space.
- `e2e/shelf-paging.spec.ts` uses `/design`'s long shelf. At 1440 and 390 px it checks one forward and one back press in a real browser, and that the last card is fully visible at the end.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 235 files, 1,476 tests passed, including the new `shelfPaging.test.ts`.
- Database (`supabase test db`): 199 files, 4,570 tests passed. Nothing changed there.
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (shelf-paging, design-page, discover): 45 of 45 passed.
- The first lint run flagged the new spec's test body as too complex. It now uses two small helpers, and lint passes.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
