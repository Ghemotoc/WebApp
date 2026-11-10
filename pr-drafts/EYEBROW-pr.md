<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Robert, 6 Nov 2026, 07:17 UTC: "the yellow fonts should be exactly the same as the ones from the original The Magic Coffin. Including the eyebrows, they should look exactly the same as the original The Magic Coffin. I don't like how it looks now in that ugly font."

## What changed

- **Eyebrow labels now use the parent company's eyebrow style**, taken from its design system (`--fs-label`, `--tr-label`, `--text-label`):
  - Inter Bold, 12 px, capitals, 0.2em letter-spacing;
  - dark gold #815E18 on light and gold #E6C24C on night (the existing `--eyebrow` tokens already matched).
- One `eyebrow` utility in `src/styles/index.css` (plus `eyebrow-type` for the one place with its own colour, the chapter end), so the look lives in one place. About 37 components now use it instead of repeating `font-eyebrow text-sm text-eyebrow`.
- `--font-eyebrow` is Inter. Cutive is removed: the `@fontsource/cutive` package and its import are gone, so the font no longer downloads.
- The words stay in sentence case in the locale files; only the drawing is in capitals, so screen readers read words, not letters.
- The design page's eyebrow sample now says it is drawn like the parent company's (en and ro).
- **Docs:** `CLAUDE.md` (Fonts line), `docs/definition-of-done.md` (eyebrow rule), `docs/decisions.md` (new row), `docs/board-fixes.md` (the boards still draw Cutive), `docs/stories/s1-e17-story-atlas.md`.

## Tests

- `e2e/design-page.spec.ts` checks the sample eyebrow is Inter, 12 px, weight 700, uppercase with 2.4 px letter-spacing.

## Local check run

- `npm run lint`, `npm run typecheck`, Prettier: clean.
- `npm test` (Node 24): 242 files, 1,510 tests passed.
- `npm run i18n:check`: passed.
- e2e: design-page, discover, home, writer-dashboard, share, notifications (74 passed); epic-s1-e1, epic-s1-e4, epic-s1-e5, download-my-stories (64 passed).
- No migration, so the database steps are unchanged from main.

## Follow-ups

- The design boards still draw Cutive eyebrows; noted in `docs/board-fixes.md`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
