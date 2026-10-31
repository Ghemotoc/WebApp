<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part e: S1-E17-23, S1-E17-24, S1-E17-25 and S1-E17-26, plus the "Appears in" half of S1-E17-12 ("Mentioned in" needs the [[Name]] links of part h).

## What changed

- **Database:** migration `20261104140001_s1_e17_24_chapter_plans.sql`.
  - `chapter_plans`: one private planning row beside every chapter: type (chapter, prologue, interlude, epilogue), planning status, point of view, act, word target, in-world date and sort value, location and summary. A trigger on `chapters` makes it, and a backfill gives every existing chapter one. It is a separate table, not columns on `chapters`, because readers can read a published chapter's row; nothing here ever reaches them (S1-E17-24).
  - `chapter_plan_characters` (the characters present) and `chapter_scenes` (a chapter's scenes in order, S1-E17-25).
  - Policies `chapter_plans_select_own`, `chapter_plan_characters_select_own` and `chapter_scenes_select_own`: only the writer reads them.
  - `chapter_plan(code)`, `story_chapter_progress(slug)` and `character_appearances(id)` read them; `update_chapter_plan()`, `set_chapter_character_present()`, `add_chapter_scene()` (at most 100 per chapter), `update_chapter_scene()`, `move_chapter_scene()` and `delete_chapter_scene()` change them. A point of view, act or character from another story is refused.
- **The writing view is the existing chapter editor** (S1-E17-23), with its autosave, drafts and publishing unchanged, plus:
  - the story's chapters on the left (last on a phone), each with its words against its target and a bar (S1-E17-26), and "New chapter", which makes an ordinary draft chapter (S1-E17-24);
  - "Plan for this chapter" under the aside: every planning field saving by itself, the characters present as toggle chips, and scenes that are added, changed, moved with Earlier and Later and deleted after a second click;
  - "6 / 3,000 words" under the text once the chapter has a target, live as the writer types;
  - a warning to split the chapter once it nears the most one chapter can hold;
  - "Focus mode", a toggle that hides the plan and the chapter list.
- **Character sheets** gain "Appears in": the chapters the character is the point of view of or present in, each opening the chapter with one click (S1-E17-12).
- **Shared:** `api/checkedAnswer.ts` (moved out of `api/bible.ts`, now used by both).
- **Text:** `chapterPlan` in `atlas.json` and `newChapter` in `editor.json`, ro and en.

## How it was tested

- **pgTAP `194-chapter-plans` (28 tests):** the trigger; allowed and denied for all three policies (another member and a moderator denied, signed out refused); every field saving, with ș corrected and texts trimmed; '' and null clearing; unknown changes, non-numbers, an unknown type and a point of view from another story refused; characters present on and off; "Appears in" in order; the chapter list with words and targets; scenes added, moved, changed, refused without a title and deleted; deleting a character clears it; a purged chapter takes its plan and scenes; no user ID in the answer.
- **021-signed-out-reads:** lists the three new tables. **Policy coverage check:** passes.
- **Vitest:** `optionalNumbers` and `chapterLength`.
- **e2e `atlas-chapter-planning.spec.ts` (17 tests):** every field saves and survives a reload; the target shows under the text and in the list; focus mode; scenes; "Appears in"; the long-chapter warning; "New chapter" from the list; axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en.
- **The editor's own specs against the new layout:** chapter-editor, chapter-editor-offline, chapter-pictures, chapter-drawings, music-and-video, publish, copy-protection, epic-s1-e3 and writer-dashboard, plus atlas-characters and atlas-at-a-glance.
- **Screenshots:** checked by eye at 1440 and 1100 (light, en), 768 (night, ro) and the sheet. The first axe pass found the Focus mode button under the Saving panel's desk-lamp doodle at 1440; the button now follows the breadcrumb instead of sitting at the far right.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 906 of 906.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 104 files, 2,242 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** the new spec and the eleven related specs pass 111 of 111, with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration, and its backfill gives every existing chapter its empty plan.

## Board mismatches

- There is no board for Story Atlas yet, and board 4.3 (the editor) has no chapter list or planning panel. The list and the panel follow the editor's cards, with no doodles.
- S1-E17-23 says the editor's limit for one chapter is "about 40,000 words". The real limit is 100,000 characters (`MAXIMUM_CHAPTER_CHARACTERS`, about 16,000 to 18,000 words), so the warning starts at nine tenths of that.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- "Mentioned in" on the sheet comes with the [[Name]] links in part h (S1-E17-31).
- The board, timeline and point-of-view lanes (part f) will read these planning fields.
- Acts can't be renamed or added yet; the board in part f is the natural place.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
