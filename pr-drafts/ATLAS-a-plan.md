# ATLAS-a plan: stories, details and at a glance (S1-E17-01 to 06)

Bundle 5b ATLAS, part a. Built on New story (S1-E3-01), Story settings (S1-E3-05) and the labels (S1-E3-06). No story issue exists yet (the Sync story issues job can't run while Actions billing fails), so the PR says "Part of S1-E17" and links PR #230.

## Database (migration 20261104100001_s1_e17_01_story_plans.sql)
- `story_plans`: one row per story (`story_id` primary key, references stories, on delete cascade; `user_id` not null, references profiles). Private planning fields: logline, series name, word target (default 90,000), writing status (planning, drafting, revising, editing, finished, on hold), publishing route (undecided, serial here, complete here, here and elsewhere), linked project label and web address (http or https only). kind: user_content; reportable: story.
- `story_plan_acts`: Act I, Act II and Act III for every plan (position, name), private.
- A trigger after insert on `stories` makes the plan and its three acts, so New story always makes the plan (criterion 1). The migration backfills a plan for every existing story; the seed's stories get one through the trigger.
- RLS: select own only (`story_plans_select_own`, `story_plan_acts_select_own`). Writes only through functions. Grants: select to authenticated; nothing to anon.
- `story_plan(story_slug)`: the plan, the story's title, category, rating and blurb, words written (sum of draft word counts), chapter count, published chapter count and the five chapters edited most recently. Owner only; another writer's slug answers not_found.
- `update_story_plan(story_slug, changes)`: changes the plan's own fields, checked. Title, genre and audience go through the existing `update_my_story()` (one place for both sides, criterion 3).
- Default bible sections come in part d, which adds them to every plan.

## Screens (src/features/atlas/)
- `/plan`: opens the last story planned on this device (localStorage, criterion 2), else the newest, else an empty state with New story.
- `/plan/s/:storySlug`: the Atlas top bar (the story switcher, a select listing every live story I write, and the Write link), then the at-a-glance page: details form (autosave after a pause, with a status line), words against the target (number, progress bar with text), chapters, recently edited chapters, linked project ("Open <label>", new tab, rel noopener), Delete (the existing DeleteStoryControl, asked twice).
- "Plan" beside Story settings on each story card in Your writing, and "Plan this story" in the chapter editor's Story details. New story with `?from=plan` opens the at-a-glance page after creating (criterion 1).

## Moved to later parts
- S1-E17-06's chapter status counts and the target check (S1-E17-07) need the planning status and chapter targets of S1-E17-23 and S1-E17-28: part e.
- The cast count needs characters (part b); open questions and ideas need part g. Each part adds its line to the at-a-glance page.

## Tests
- pgTAP 190-story-plans: allowed and denied per policy; trigger and backfill; update checks (word target, status, bad address refused); another writer gets not_found; signed out refused.
- Vitest: lib functions (progress text, last-story storage, address check).
- e2e atlas-at-a-glance.spec.ts: New story from Atlas lands on at a glance; edit details autosave and survive reload; title change shows in the switcher; switcher; linked project; delete asked twice; axe and no sideways scroll at 390, 768 and 1440, light and night, ro and en.
