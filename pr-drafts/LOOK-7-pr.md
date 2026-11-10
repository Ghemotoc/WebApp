<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-7, from the design gap report and the LOOK-0..7 brief).

## What changed

- **One avatar style**: a shared `PersonAvatar` (initials on the plum gradient, with the person's drawn avatar from AVATAR-1 over them) replaces the hand-drawn initial circles in forum posts, comments, the Library's followed writers and the writer dashboard; chats use it too. Unit-tested in `PersonAvatar.test.tsx`.
- **Footer in the board's order with one "Contact us"**; the company and legal contacts page keeps its one-tap footer link under its own name (S1-E14-02, DSA arts. 11 and 12).
- **The bell keeps its count**, as S1-E7-01 asks. This and the other remaining differences are logged in `docs/board-fixes.md`.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), and lint, types, unit, database and build checks pass.

## By hand (staging)

- Nothing.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
