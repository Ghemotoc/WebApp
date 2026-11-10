<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-3, story S1-E5-08 from the LOOK-0..7 brief): the home page's missing sections and the big footer.

## What changed

- **Trending gets genre chips**; **New and rising writers** (`rising_writers()`, LOOK-4c) joins Completed.
- **Four CMS bands**, each hidden while its heading is empty: the writers' band with four points, the forums band, the gold "Start your first story" and "Apps come later". Version 1 copy in ro and en is added to the published home page by the migration. While S1-E2-03 is off, nothing mentions under-16 consent.
- **`public_forum_highlights()`**: busy threads from the platform's own forums and public 16+ spaces, for anyone. It never shows a class, private or under-16 space, and only shows people who may be put on show.
- **Questions in two columns** with the balloon doodle, and **the big footer** with the CMS footer note.
- **Staff › Website › Home page** gains "Bands lower down and the footer".
- Tests: pgTAP 306 (14 tests), unit tests for the reader and the band rules, and `e2e/home-bands.spec.ts`.

## How it was tested

- The full check list ran on the stack of the ten queued bundles. The failures it found were fixed and rerun, and all pass. Lint, types, generated types, schema, unit, database (306 included) and build checks all pass.

## By hand (staging)

- Nothing: the migration adds the copy to the home page.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
