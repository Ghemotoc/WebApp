<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part i, the last part: S1-E17-32 (choose what readers can see), S1-E17-33 (readers' pages), S1-E17-34 (public items are reportable and moderated), S1-E17-35 (spoiler guard) and the epic check S1-E17-QA.

## What changed

- **Database:** two migrations.
  - `20261104180001_s1_e17_34_enums.sql`: `atlas_item` joins `reportable_type`, on its own because Postgres can't use a new enum value in the transaction that adds it.
  - `20261104180002_s1_e17_32_public_plan.sql`: `story_plans.public_areas` (empty by default, so nothing is public until the writer turns an area on); `is_private` on characters, relationships, bible sections, entries and events; `show_from_chapter_id` on characters, entries and events; `story_characters.public_sheet_parts` (Basics, Look and voice and In the story open by default; Inside and Notes closed). No new tables, so the plan tables keep their owner-only policies; readers get everything through one security definer function.
  - `get_public_story_plan(slug)` for visitors and members: the story's own read rules first (a readable chapter, the rating, blocks either way, moderation), then only the areas that are on, never a private item, never a closed part of a sheet, a relationship only when both its characters show, and an item with a chapter only once the reader has a reading position at or past it. No user ID anywhere.
  - The writer's `story_plan_visibility()`, `preview_story_plan()` (the readers' answer with each chapter guard shown), `set_story_public_areas()`, `set_plan_item_privacy()`, `set_plan_item_show_from()` and `set_character_public_parts()`.
  - `atlas_item` branches in `reportable_item_owner()`, `reportable_item_summary()` ("Character "Ana" in the world of …"), `case_item_content()` and `notification_item_json()`; a moderator hides or removes one item with `is_moderated_away('atlas_item', id)` and the writer still has it.
  - `atlas_images_select_public` on storage, through `atlas_picture_is_public()`: a reader sees a public character's picture only once it passed the picture check.
- **Writer screens:** a Readers tab in Story Atlas (`/plan/s/:slug/readers`) with the five area switches, a line on how it works, a notice while the story isn't published and "Preview as a reader". Each character, relationship (on Connections), bible section and entry and event has "Keep private" (heard as "Keep private: <name>") and, where it applies, "Readers see it from" a chapter; a sheet has chips for the parts readers see.
- **Reader pages:** `/s/:slug/atlas/characters`, `/map`, `/family-tree`, `/world` and `/timeline`, plus one character's page, with the story's title linking back and a Report action on each item. The map and the family tree are the writer's own components, now drawn for readers too. `[[Name]]` links on reader pages point only at public items. The story page lists the areas that are on under "The story's world". No doodles: plain reading pages.
- **Text:** `readers` and `publicPlan` in `atlas.json`, `storyPage.world` in `reading.json`, `atlas_item` in `reporting.json` and `notifications.json`, ro and en.

## How it was tested

- **pgTAP `198-public-plan` (40 tests):** nothing public on a new plan; unknown areas, parts and other stories' chapters refused; Keep private; open groups only, then Inside and an opened custom field; the spoiler guard for a visitor and for a reader past the chapter, with the relationships that follow; blocks either way; no user ID; a hidden entry gone for readers and kept for the writer; areas on before publishing; another member can't read or change the switches; signed out can't preview; a report finds the writer, the queue summary, the notice link; allowed and denied tests for `atlas_images_select_public`; turning areas off takes everything away at once.
- **Vitest:** `publicPlanAreas`.
- **e2e `atlas-public-plan.spec.ts` (30 tests):** nothing public at first; the writer turns on Characters and Timeline and the story page and reader pages show them, World stays unavailable; Keep private and closed parts; the preview marks the event waiting for chapter 2, a visitor doesn't see it, a reader who opened chapter 2 does; a reader opens Report on a character; axe, no sideways scroll and no doodle overlap on the Characters and Timeline pages at 390, 768 and 1440 px, light and night, ro and en; turning Timeline off takes it away.
- **Epic check `epic-s1-e17.spec.ts` (S1-E17-QA):** a writer with two stories makes a character in one, it survives a reload, searching the other finds nothing and its own finds it (accents ignored), and once deleted it is gone; another member and a moderator get nothing of the private plan, nothing public before an area is on, then exactly the public characters and never the private one. The axe checks for every Atlas screen are in each part's own spec.
- **Screenshots:** checked by eye at 1440 (light, en) and 390 (night, en): Readers settings, the sheet's "What readers see", the preview's timeline with its chapter pill, the story page's links and the readers' cast, character, map, world and timeline pages.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 940 of 940.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 108 files, 2,344 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** the two new specs pass 32 of 32 with `--workers=1`.
- **Full run (end of bundle):** three parallel shards plus `legal.spec.ts` alone: 1,005 passed and 54 failed, all in specs that share seed rows and ran at the same time on one database. The 46 affected spec files then ran one at a time: 661 passed, 3 failed. After a fresh `db reset` (one picture and one notification row were left over from the parallel run), `atlas-characters` and `notifications` pass. The one left is `reader-performance`'s "first paragraph within 2 seconds on a throttled phone" (2.8 to 3.3 seconds here); it fails the same way on `main` (2.8 seconds) on this machine, so it is the machine's load, not this change. Nothing in this part touches the chapter reader.

## By hand

Nothing. The migrations reach staging through Supabase's GitHub integration.

## Board mismatches

- There is no board for Story Atlas or its reader pages yet. They follow the story page's cards, label rows and pills, with no doodles (reading pages).

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- The chapter reader's 2-second load check is close to its budget on a busy machine (it fails on `main` here too); worth watching on CI once Actions runs again.
- `[[Name]]` written in a character sheet's fields shows as plain text, for the writer and readers alike; only entries and events draw links. Sheets could draw them too.
- On a phone the map scrolls inside its own region, so a character placed far right needs a sideways swipe in the map (as on the writer's Connections page).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
