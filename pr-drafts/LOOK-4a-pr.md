<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's queue from 6 Nov 2026 (bundle LOOK-4a, story S1-E5-10 from the LOOK-0..7 brief).

## What changed

- **Staff › Stories › Featured**: every current active story with its rank, its climb over 7 days, reads, read-through and followers, and whether it can be featured (and why not). Admins and the owner pick up to five.
- **The database decides**: `featured_picks` and `story_rank_snapshots` (RLS, explicit grants, allowed and denied pgTAP tests in 303 and 021) refuse writers under 16, log before and after values in the audit log and tell each newly featured writer.
- **Discover opens with the Featured this week band**, re-checked for each reader every time (rating, blocks, moderation).
- **Missing classics account is safe**: a new non-raising `is_classics_account()` replaces the raising `classics_account_id()` in these checks, so Discover keeps working when the classics account isn't set up.
- **Terms of use** (ro and en) say Featured this week is picked by the team with help from the ranking. Two seed picks for local development.

## How it was tested

- The full check list ran on the stack of the ten queued bundles; the failures it found were fixed and rerun (all pass), including database test 303 (31 tests) and `featured-this-week.spec.ts`. Lint, types, generated types, schema, unit, database and build checks pass.

## By hand (staging)

- After the LOOK-4a migrations reach staging, run `supabase/staging-topups/look-4a.sql` once (safe to run twice; adds no accounts) so the band shows on staging.
- The terms of use change needs the usual lawyer read before a new legal version is published.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
