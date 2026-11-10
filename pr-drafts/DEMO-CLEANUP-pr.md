<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Robert, 6 Nov 2026, 17:17 to 17:19 UTC: remove the demos from staging and only leave the classics; keep one account for demos, the Lia one from the mockups (`adult_writer`, "Lia Scrie"), with a few of her stories (17:21 UTC).

## What changed

- **`supabase/staging-topups/remove-demo-stories.sql`**, a staging clean-up run by hand:
  - deletes the demo stories (9100 id block) and the seed stories (9000 id block), except Lia's seven, the way an account deletion deletes stories (`delete_account_stories()` steps; anything a moderation case holds is hidden instead);
  - deletes the five synthetic demo writers through `delete_account_data()`, so their user IDs are kept and never reused;
  - keeps the 20 classics, the classics account, all 16 seed personas and any story written by hand on staging. It refuses production, and it's safe to run twice.
- **`supabase/staging-topups/README.md`** explains it: run `classic-authors.sql` first, and don't run parts 2a and 2b afterwards.

## How it was tested

- On a local database reset to `main`, with demo content parts 2a and 2b loaded, I ran `classic-authors.sql` and then the clean-up twice. Both runs showed `other_demo_stories 0, lia_stories 7, demo_writers 0, classics 20, demo_account "Lia Scrie"`. Dănilă Prepeleac's byline reads Ion Creangă, and a deleted demo writer's login is closed (`…@deleted.invalid`, banned).
- There is no app code change, so CI's quick checks are enough.

## By hand (staging)

- In ghemotoc-staging's SQL Editor, run `supabase/staging-topups/classic-authors.sql`, then `supabase/staging-topups/remove-demo-stories.sql`. Robert has the step-by-step guide in the project thread.

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
