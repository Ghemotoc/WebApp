<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part f: S1-E17-19 (chapter board), S1-E17-20 (timeline), S1-E17-21 (POV lanes) and S1-E17-22 (toggle between views).

## What changed

- **Database:** migration `20261104150001_s1_e17_19_storyline.sql`.
  - `story_events`: the timeline's in-world events (title, date as shown, a numeric sort value, description; at most 500 per story). Only the writer reads them (`story_events_select_own`).
  - `story_storyline(slug)`: one reading for all three views (chapters in book order with their planning, acts, characters, events).
  - `place_chapter_on_board(code, act_id, codes, confirmed)`: saves a board move, the new order and the act. When the published chapters would change order it answers `needs_confirmation` and changes nothing until the writer confirms, as Manage chapters does (S1-E3-04). A draft moving never asks. It checks the account gate, because the order is public.
  - `add_chapter_to_act(slug, act_id)`: a draft at the end of an act ("No act" adds at the end of the book).
  - `add_story_event()`, `update_story_event()` and `delete_story_event()`.
- **Storyline page** at `/plan/s/:slug/storyline`, a new "Storyline" section in the Story Atlas row.
  - A view toggle (Board, Timeline, POV lanes) that remembers the last choice on the device (S1-E17-22).
  - **Board:** one column per act, then "No act"; on a phone the columns stack. Each card shows its label (Prologue, Chapter 3…), title (a link to the writing view), planning status, "Published" when it is, POV, words against target and in-world date. Earlier, Later, Previous act and Next act do what a drag does. A move that renumbers published chapters asks "Change the order readers see?". "Add chapter" on each column.
  - **Timeline:** add an event (title, date as shown, sort value, description); events and dated chapters sort together, each marked "Event" or "Chapter" in words; edit an event's fields (each saves by itself) or delete it after a second click; undated chapters listed apart as links to their plans.
  - **POV lanes:** a table with chapters down the rows and one column per character who tells a chapter, the mark being the status pill (colour and words).
- **Chapter numbers in the plan** count only chapters of the type "chapter", so a prologue doesn't make the first chapter "Chapter 2". The writing view's list uses the same numbers.
- **Text:** `storyline` and `nav.storyline` in `atlas.json`, ro and en.

## How it was tested

- **pgTAP `195-storyline` (26 tests):** the reading in order; events added, sorted, changed, refused without a sort value, with an unknown change or a non-number, and deleted; board moves that save at once, a draft moving without asking, a published reorder waiting for confirmation and then saving, an out-of-date list and another story's act refused; "Add chapter" in a filled act, an empty act and "No act"; allowed and denied for `story_events_select_own`; another member, a suspended writer and a signed-out visitor refused; no user ID in the answer.
- **021-signed-out-reads:** lists `story_events`. **Policy coverage check:** passes.
- **Vitest:** `boardColumns` (columns, moves, numbers) and `timeline` with `povLanes`.
- **e2e `atlas-storyline.spec.ts` (18 tests):** the board's cards and columns, a card opening the writing view; the move buttons; a drag and a button move that ask first, with "Keep the order" changing nothing; "Add chapter"; the timeline's add, sort, change and delete and the remembered view; the lanes; axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en, each view at every width.
- **Screenshots:** checked by eye: board at 1440 (light, en), 768 (night, ro) and 390; timeline at 1440 and 390 (night, ro); lanes at 1440 (night) and 390.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 917 of 917.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 105 files, 2,268 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** the new spec and eight related specs (the other Atlas specs, chapter-editor, manage-chapters and epic-s1-e3) pass 142 of 142, with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration.

## Board mismatches

- There is no board for Story Atlas yet. The storyline follows the Atlas pages' cards and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- Acts still can't be renamed, added or removed; a small acts editor on the board would fit later.
- Moving a chapter to another act from its plan panel doesn't change the book order; only the board reorders. Noted in case writers expect the panel to move it.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
