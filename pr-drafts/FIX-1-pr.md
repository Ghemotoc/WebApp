<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of the builder's FIX-1 bundle (Robert's 6 Nov 2026 list). Follow-up fixes to S1-E3-05 (the story page), S1-E11-16 (classics) and AVATAR-1.

## What changed

- **Classics are Completed and show the year the work first came out.** A new `first_published_year` on stories (migration `20270202110001_fix_classics_year_and_status.sql`); every classic in `content/classics/texts/` carries its year; the demo builder and the staging top-ups write it.
- **A writer's story shows the year of its first chapter** under "Labels from the writer".
- **Only "Ongoing" shows as a pill** on story cards.
- **Story page, desktop:** the title, buttons and blurb sit beside the cover, as on the board.
- **Staff accounts can save their own drawn avatar** (`20270202110002_fix_staff_avatar_save.sql`).
- **Two e2e tests no longer depend on run order:** forum search now waits for the filtered results; message settings puts back the seed's follow (teen_17 follows adult_writer) that other files remove.

## How it was tested

- `npm run lint`, `typecheck`, `types:check`, unit tests, `supabase db reset` + `supabase test db` (new test 302) and `i18n:check` pass locally.
- Full e2e: six files failed in the full run; after the fixes, all six re-run together pass (50 passed, 0 failed).

## By hand (staging)

- Run `supabase/staging-topups/classic-authors.sql`, then `supabase/staging-topups/demo-content-2a.sql` (both safe to run twice; they refuse production).

## Follow-ups

- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
