<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 17 CHECK: a fix for the one real failure the whole-app run found. It has no story issue of its own; the rank pill on story cards came from IDEAS-3a (#336).

## What was wrong

At 390 px the search page scrolled sideways: the page was 4,252 px wide. The search e2e failed both in the sharded run and when re-run alone.

The cause was the rank pill on story cards. On a card it shows only the rank's name, with "Rank:" for screen readers in a `sr-only` span, which is absolutely positioned. Nothing around it was positioned, so the span escaped the shelf's sideways scrolling and sat at its place far to the right, widening the whole page. Any shelf of ranked writers' stories did the same on a phone.

## What changed

- `RankChip`: its wrapper is `relative`, so the hidden label stays inside the pill wherever it appears.
- `Shelf`: every cell is `relative` too, so nothing absolutely positioned inside any card can escape a row again.

## Tests

The existing search e2e covers it: its axe and sideways-scroll check at 390 px failed before and passes now.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Build without env and `third-party:check`: passed.
- Prettier, lint, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 236 files, 1,481 tests passed.
- Database (`supabase test db`, after a reset): 200 files, 4,594 tests passed.
- Wrangler compile and the build with env: passed.
- e2e (search, shelf-paging, discover, design-page, classics-shelf, home, writer-ranks, rank-notifications, library): 112 of 112 passed, including the search check at 390 px that failed before.

## By hand

Nothing.

## Follow-ups

None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
