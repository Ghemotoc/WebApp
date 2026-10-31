<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part g: S1-E17-27 (capture questions and ideas), S1-E17-28 (tick off and record decisions) and S1-E17-29 (marketing notes).

## What changed

- **Database:** migration `20261104160001_s1_e17_27_ideas_and_marketing.sql`.
  - `story_ideas`: a question, idea, to-do or decision, one line of up to 1,000 characters, "Action or outcome" and the day it was done; at most 1,000 per story. Only the writer reads them (`story_ideas_select_own`).
  - `story_marketing`: one row per story, made on the first save, with the blurb, comparable titles, hooks and keywords, query pitch and launch notes. Only the writer reads it (`story_marketing_select_own`).
  - `story_ideas(slug)` (newest first) and `story_marketing(slug)`; `add_story_idea()`, `update_story_idea()` (kind, body, outcome and is_done, which records the first day it was done and keeps it), `delete_story_idea()` and `update_story_marketing()`.
- **Ideas page** at `/plan/s/:slug/ideas`, a new "Ideas" section in the Story Atlas row.
  - A quick-add box: the type (Question, Idea, To-do, Decision) and one line; Enter adds it and the box clears, keeping the type.
  - The list with Open, Done and All (each with its count). Each note shows its type as a pill, a Done tick-box (its accessible name says which note), "Done on …" once ticked, its text and "Action or outcome" (each saving by itself), its type and Delete (asked twice).
- **Marketing page** at `/plan/s/:slug/marketing`, a new "Marketing" section.
  - "The pitch": the logline and publishing route (the same fields as At a glance), the genre and audience (the same as Story settings), the blurb, comparable titles and hooks. "Getting it out": the query pitch and launch notes. Every field saves by itself.
  - "Back cover": a button that opens a book-shaped preview with the title, logline, blurb and "For readers of" the comparable titles, all as real text.
- **Shared:** `useStoryChoiceOptions` now gives At a glance and Marketing the same genre and audience lists.
- **Text:** `ideas`, `marketing`, `nav.ideas` and `nav.marketing` in `atlas.json`, ro and en.

## How it was tested

- **pgTAP `196-ideas-and-marketing` (20 tests):** adding and reading each line with its type, trimmed; a wrong type and an empty line refused; ticking done records the date and saves the outcome, ticking it open again clears the date; an unknown change and a done flag that isn't true or false refused; deleting; marketing notes read empty before the first save, each field saving by itself and keeping the others; an unknown change and an over-long pitch refused; allowed and denied for both policies; another member and a signed-out visitor refused; no user ID in the answers.
- **021-signed-out-reads:** lists both tables. **Policy coverage check:** passes.
- **Vitest:** `ideaFilters`.
- **e2e `atlas-ideas-marketing.spec.ts` (30 tests):** quick-add on Enter with its type and an empty line refused; ticking and the filters with the day shown; the text, outcome and type saving, and the two-step delete; every marketing field saving, with the logline shared with At a glance and the genre with the story; the back-cover preview opening and closing; axe, no sideways scroll and no doodle overlap on both pages at 390, 768 and 1440 px, light and night, ro and en; the open back cover passing axe on a phone.
- **Screenshots:** checked by eye: both pages at 1440 (light, en) and 390 (night, ro), the back cover open.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 920 of 920.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 106 files, 2,288 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** the new spec and the six other Story Atlas specs pass 143 of 143, with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration.

## Board mismatches

- There is no board for Story Atlas yet. Both pages follow the Atlas pages' cards, pills and fields, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- S1-E17-28's "[[name]] links to a character, entry or chapter" comes with part h (S1-E17-31 cross-links), which the story depends on.
- The Open filter hides a note as soon as it is ticked; if writers find that abrupt, a short "Moved to Done" note could follow.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
