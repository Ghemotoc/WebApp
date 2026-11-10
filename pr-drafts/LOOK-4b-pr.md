<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-4b, story S1-E5-12 from the LOOK-0..7 brief).

## What changed

- **Discover greets the member**: "Good morning, <name>." with the board's gold line under a dated eyebrow.
- **"Your dashboard" cards**, each shown only when it has something real: Continue reading (the member's latest unfinished story they may still read, chapter n of N, and "Chapter n is out" only when a newer chapter came out after they last read), Your draft (their latest draft chapter) and the gold Start a new story card (only when they may write). `my_discover_cards()` reads only the caller's own rows.
- **The board's five shelves** (Robert, D5): `discover_shelves` becomes following, popular, rising, classics, writers. Category shelves move to the chips. Staff can change the setting back without a release.
- Tests: pgTAP 305 (15 tests), a unit test for the reader, `e2e/discover-cards.spec.ts`; `discover.spec.ts`, `onboarding.spec.ts`, `paragraph-links-most-shared.spec.ts` and database test 219 updated for the new shelves.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), including database tests 219 and 305 and the Discover browser tests. Lint, types, generated types, schema, unit, database and build checks pass.

## By hand (staging)

- Nothing: the shelf setting changes in the migration.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
