<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-4c, story S1-E5-11, with S1-E2-03b, from the LOOK-0..7 brief).

## What changed

- **One rule for suggesting a writer to strangers**: `may_spotlight_writer()` says yes only for an active writer whose own "Suggest me" switch is on and who is 16 or over, or 13 to 15 with a parent's separate yes. Featured this week stays 16 and over.
- **Writers to follow** on Discover, from `rising_writers()`.
- **Settings › Privacy › "Suggest me and my stories to other people"**: on by default for adults, off for under-18s, with "Ask my parent" for 13 to 15.
- **The parent's separate yes** (S1-E2-03b): an optional box on the consent page, a one-question parent page, a staff withdraw action and two notifications.
- **Featured explains itself**: the staff Featured table now says when a writer can't be picked because they turned "Suggest me" off (`writer_not_suggested`, ro and en).
- **Privacy notice** (ro and en) describes the new processing and its legal basis.
- Tests: database test 304 (new) plus updates to 209 and 303; `writers-to-follow.spec.ts` sets up its own consent language and local secret so it doesn't depend on test order.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), including database tests 209, 303 and 304 and `writers-to-follow.spec.ts`. Lint, types, generated types, schema, unit, database and build checks pass.

## By hand (staging)

- The privacy notice change needs the usual lawyer read before a new legal version is published.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
