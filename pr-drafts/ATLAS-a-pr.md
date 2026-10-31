<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part a: S1-E17-01 to S1-E17-06.

## What changed

- **Database:** migration `20261104100001_s1_e17_01_story_plans.sql`.
  - `story_plans` holds one private plan per story: logline, series name, word target (90,000 by default), writing status, publishing route and a linked project (http or https only).
  - `story_plan_acts` starts every plan with Act I, II and III.
  - Policies: `story_plans_select_own` and `story_plan_acts_select_own`, so only the writer can read a plan. Every write goes through a function.
  - The trigger `stories_make_plan` makes the plan whenever a story is made. Stories that existed before were backfilled.
  - `story_plan(slug)` returns the at-a-glance page's data. `update_story_plan(slug, changes)` saves the plan's own fields.
- **Story Atlas screens** (`src/features/atlas/`):
  - `/plan` opens the story you planned last on this device, or your newest story, or an empty state.
  - `/plan/s/:slug` has the top bar (story switcher, Write, New story), then The story, Words against the target, Chapters (recently edited, Manage chapters), Story details, Linked project and Delete.
  - Delete is the existing two-step delete.
  - Every field saves by itself after a short pause, with a Saving, Saved or plain-error line under it.
  - The title, genre and audience are the story's own fields and save through `update_my_story()`, so Story settings shows the same values.
- **Joined to the writer section:**
  - "Plan" sits beside Story settings on each story card in Your writing.
  - "Plan this story" is in the chapter editor's Story details.
  - New story opened from Story Atlas (`?from=plan`) opens the new story's plan.
- **Text:** a new `atlas` namespace in ro and en, plus three keys in `writing` and `editor`.
- **Moved to later parts:**
  - Chapter status counts and the target check (S1-E17-07) need the planning status and chapter targets from S1-E17-23 and S1-E17-28, so they come in part e.
  - The cast count comes in part b, and open questions and ideas in part g.
  - The default bible sections come with the bible in part d.
- **Test fix (not this story):** `writer-dashboard.spec.ts` now turns on reduced motion before its axe checks, like `checkScreen` does. In the bundle 5 full run, axe read its eyebrow halfway through the page's fade-in.

## How it was tested

- **pgTAP `190-story-plans` (23 tests):**
  - a new story gets its plan and acts;
  - allowed and denied tests for both policies (another member and a moderator are denied);
  - direct writes are refused;
  - each field saves on its own and is trimmed;
  - a bad address, an unknown status and a 0 target are refused;
  - the chapter numbers are right, and no user ID is returned;
  - a signed-out visitor is refused, and purging the story takes its plan and acts with it.
- **021-signed-out-reads:** lists the two new tables.
- **Vitest:** `lastPlannedStory`, `planProgress`, `wordTarget` and `linkedProject`.
- **e2e `atlas-at-a-glance.spec.ts` (17 tests):**
  - New story from Story Atlas opens the plan with 0 of 90,000 words;
  - details autosave and survive a reload, and a new title shows in the switcher;
  - a bad word target and a non-web address wait with a plain message;
  - "Open Mood board" opens in a new tab with noopener;
  - "Plan" on Your writing works, the switcher works, and /plan opens the story open last;
  - another writer gets "couldn't find that story";
  - Delete asks twice and offers Undo;
  - axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye at 1440 (light, en), 768 (light, ro) and 390 (night, ro).

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 868 of 868.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 100 files, 2,139 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `atlas-at-a-glance`, `create-story`, `story-settings`, `writer-dashboard`, `chapter-editor` and `chapter-editor-offline` pass 101 of 101 with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration, and the backfill gives every staging story its plan.

## Board mismatches

There is no board for Story Atlas yet. The page follows the writer screens' cards, fonts and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
