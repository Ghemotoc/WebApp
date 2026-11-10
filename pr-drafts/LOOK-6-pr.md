<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-6, from the design gap report and the LOOK-0..7 brief). Brings sign-up and log-in closer to board 2.1.

## What changed

- **Sign-up benefits** get the board's doodle icons, and the handwritten tag gets its smiling heart (`SignUpHero`).
- **"What you might see next"** previews what comes after Create account, showing only the cards true for the current flags: the age check card hides while `adults_only` is on, and the too-young card then says "under 18, for now" (`SignUpWhatNext`, new ro and en text). Noted in `docs/board-fixes.md`.
- **Log in** gets the board's teacup, and "Check your email" its mail icon and heart. Every doodle stays clear of text and controls.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), and lint, types, unit, database and build checks pass.

## By hand (staging)

- Nothing.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
