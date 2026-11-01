<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E13-05 (Download my stories). The story issue doesn't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 8 PRIVACY, part e. A writer downloads whatever they want from Settings › Download my data › Download my stories. They choose one story or all of them, then which files to include:

- the chapters, all or only the ones they choose, as a Word file;
- the plan from Story Atlas, as a Word file;
- a machine-readable JSON copy.

Download my data, the GDPR copy, now also holds each story's plan as a readable Word file. Both work the same way: the writer's own browser builds the files with the shared Word builder (ADR 0012), and the database decides who may do what. The plan file, the chapter choice and the JSON copy are Robert's additions (1 Nov 2026, 06:27 and 06:29), beyond the story's text.

## What changed

- **Database:**
  - `20261118100001_s1_e13_05_enums.sql` adds the export kind `my_stories` and the notification `stories_export_ready`.
  - `20261118100002_s1_e13_05_download_my_stories.sql` adds new columns to `exports`:
    - `story_id`: the one story, or null for all;
    - `chapter_ids`: the chosen chapters, or null for every one;
    - `include_chapters`, `include_plan` and `include_data`: what was ticked;
    - `content_fingerprint`.
  - It also adds checks:
    - only a Download my stories copy names a story;
    - chosen chapters only for one story;
    - something must be ticked.
  - **The file type, `export_file_extension()`:**
    - one file for one story is saved as that file (`.docx` or `.json`);
    - anything more, or all stories, is saved as a `.zip`;
    - the `exports` bucket accepts all three types.
  - **`request_stories_export(story, chapters, include_chapters, include_plan, include_data)`:**
    - `stories_export_choice_problem()` refuses:
      - nothing ticked;
      - someone else's story or a deleted story;
      - no stories;
      - a chapter that isn't the story's.
    - It allows ten new copies an hour.
    - A suspended writer may still ask (criterion 3).
  - **Asking again (criterion 4):**
    - the same choices within 24 hours are answered with the earlier files;
    - but only while `stories_fingerprint()` is unchanged. It covers every row of the stories, their chapters, cards, pictures and tags and every Story Atlas part, so an edit or a deletion anywhere means a new copy.
  - **`finish_data_export()`** now finishes both kinds of export. It keeps one copy of each kind and sends `stories_export_ready` or `data_export_ready`.
- **The plan file:**
  - `src/lib/word/planToWord.ts` makes one Word file per story plan. It uses the same look as the story's file through the shared `wordDocumentBytes()`.
  - `lib/planForWord.ts` builds the plan from the Story Atlas rows. It uses Story Atlas's own words and leaves out empty parts:
    - at a glance;
    - characters, with the full sheet and the writer's own fields;
    - connections;
    - story bible;
    - storyline events;
    - chapter plans, with point of view, act, people and scenes;
    - questions and ideas;
    - marketing.
  - The file is `stories/<slug>-plan.docx` in Download my data and `<slug>-plan.docx` in Download my stories.
- **Settings › Download my data › Download my stories** (board 6.3), with id `download-my-stories`:
  - the Story drop-down;
  - "What to include": the three tick boxes, each with a hint. The chapters and the plan are ticked by default; JSON is not;
  - for one story: "All chapters" or "Only the chapters I choose", which shows a checkbox per chapter, drafts marked;
  - "Get my files", with a plain line when nothing is ticked or no chapter is chosen;
  - the ready line says what the copy holds, for example: "“Rain”: the chapters as a Word file and the plan as a Word file, in one ZIP". Its button reads "Download Word file", "Download JSON file" or "Download ZIP";
  - the "ready" notification's link scrolls to the block once it has loaded;
  - a writer with no stories sees one plain line.
- **The run:**
  - `lib/runStoriesExport.ts` asks first, then narrows the data file to the chosen stories and chapters with `lib/storiesForData.ts`. Only the story's own tables are kept: no comments, likes or messages.
  - It builds the ticked files, deletes the older copy's file, uploads the new one and finishes it.
  - The JSON copy is that narrowed file.
  - `exportRunStore.ts` holds one small store for each of the two runs.
- **Notifications:** "your stories are ready to download as Word files", linking to `/settings#download-my-stories`.
- **Text:** in `dataExport.json` and `notifications.json`, ro and en. The plan reuses the `atlas` texts.
- **Docs:** `docs/code-tour.md`, `src/features/data-export/README.md`, `supabase/README.md` and `docs/retention.md`. Each says that a new table holding story content goes into `STORY_TABLES`, `stories_fingerprint()` and, if it is part of the plan, `planForWord.ts`.

## How it was tested

- **Database test `213-download-my-stories` (28 tests):**
  - one story makes a `.docx`, all stories a `.zip`, the plan alone a `.docx`, JSON alone a `.json`, and the chapters with the plan a `.zip`;
  - chosen chapters are kept, but a chapter from another story is refused, and nothing ticked is refused;
  - another writer's story is refused, and so is a reader with no stories;
  - finishing makes the copy ready for seven days, with its size from Storage, and sends the notification;
  - a Download my data copy is left alone, and one copy of each kind is kept;
  - asking again for the same choices offers the earlier copy, while other choices make a new one;
  - after a change a new copy is made, and adding or deleting a Story Atlas idea changes the fingerprint;
  - a suspended writer can ask;
  - a Download my data copy can't name a story.
- **Vitest:**
  - `runStoriesExport.test.ts` (9 tests): reuse; one story as a Word file; all stories as a ZIP; one story with its plan and JSON as a ZIP; JSON alone; the plan alone; narrowing to one story, to chosen chapters with the whole plan, or to all.
  - `planForWord.test.ts` (4 tests): an empty plan; a character's sheet order, own fields and first chapter; the bible, storyline, ideas and marketing; a chapter plan's point of view, people and scenes.
  - `runDataExport.test.ts` now expects each story's plan file in the data ZIP.
- **End to end, `download-my-stories.spec.ts` (18 tests):**
  - one story's chapters download as `the-girl-who-fixed-radios-seed02.docx` with the title inside, and asking again offers the file back;
  - all stories with plans and JSON come as one ZIP of five files, and the JSON holds both plans;
  - only the chosen chapter goes in, after the "choose at least one chapter" line;
  - nothing ticked shows the plain line;
  - the notification link opens the block;
  - kid_14_ok sees the line for a writer with no stories;
  - axe at 390, 768 and 1440 px, in light and night, in ro and en.
- Screenshots were checked by eye at 390 and 1440 px, in ro and en.

## Local check run

On Node 24, locally:

- Static checks all pass: lint, typecheck, types:check, i18n:check, migrations:check, Prettier and the third-party build check.
- Vitest: 1,029 of 1,029 pass.
- Database (pgTAP): 123 files and 2,847 tests, all pass, including `213-download-my-stories` (28 tests).
- Wrangler compiles the Pages Functions.
- End to end (`download-my-stories`, `download-my-data`, `delete-my-account`, `notifications`): 83 passed.

## By hand

None.

## Board mismatches

- **New controls:** board 6.3 shows only the Story drop-down and "Get Word files". Robert's additions (1 Nov 2026) add "What to include" and the chapter choice, so the button now reads "Get my files". The hint adds "One file comes as it is; more come in one ZIP."
- **Unchanged:** the heading, the intro's first sentence, the drop-down and the minors note under the block match the board.

## Questions for Robert (OPEN or not in the story, built as proposals)

- **Reuse within 24 hours** happens only with the same choices and nothing changed in those stories or their plans. An edit means you want your newest words, so a new copy is made.
- **Defaults:** the chapters and the plan are ticked and JSON isn't, because most writers want readable files. Say if JSON should be ticked too.
- **What the story JSON holds:** the story's own content only (the story, its chapters, cards, pictures, revisions, tags and every Story Atlas part). Comments, likes, messages and the account stay in Download my data.
- **Chosen chapters keep the whole plan,** because the plan belongs to the story, not to one chapter.
- **Ten new copies an hour.** The work happens on the writer's own device, so this limit only stops a runaway screen from filling the bucket.
- **One copy of each kind is kept.** A new Download my stories copy replaces the older one, even for a different story. Say if writers should keep one per story.

## Follow-ups

- **PDF** comes after March (S1-E11-09b), as the hint on the board says.
- **The EPUB** is next, as part f (Robert, 1 Nov 2026, 06:31).
- **Pictures in the plan:** character pictures aren't in the plan's Word file yet. They are in the data file, listed by ID.
- **Staff data requests** (S1-E11-09a) should reuse `buildPlanFiles()`, so a staff export holds the plans too.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
