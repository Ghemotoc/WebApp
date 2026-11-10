<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-5, from the design gap report and the LOOK-0..7 brief). Brings the signed-in screens closer to the boards.

## What changed

- **Doodles on the signed-in screens**: Settings, Library, Search, Notifications, Forums, Profile and Space get the board's doodles, each beside its heading or above a card, clear of text and controls at 390, 768 and 1440 px, light and night (`doodleSources.ts`, 13 new doodle SVGs).
- **The rest of the board's doodle icon set** (12 SVGs in `src/assets/icons/`); Block, Settings and Message settings wear their doodle icons.
- **Board mismatches noted** in `docs/board-fixes.md`: doodles moved beside their headings where the board lets them touch controls; Report and Share keep plain words (no doodles on reporting and sharing); the Library drop-down keeps the shared drop-down style with no icon.
- **Tests**: three e2e specs wait for the entrance animations to finish before axe runs.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), and lint, types, unit, database and build checks pass.

## By hand (staging)

- Nothing.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
