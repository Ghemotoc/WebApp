<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part b: S1-E17-08, S1-E17-09, S1-E17-10, S1-E17-11 and S1-E17-13.

## What changed

- **Database:** migrations `20261104110001_s1_e17_08_enums.sql` (picture kind `atlas_image`) and `20261104110002_s1_e17_08_characters.sql`.
  - `story_characters`: one row per character in a story's plan, with its role (six groups), the sheet's text (the four groups of S1-E17-09, kept in one `sheet` column with a fixed list of keys), the writer's own field values, the first appearance (one of the story's chapters) and a picture with alt text.
  - `story_character_fields`: the writer's own fields. Removing one only hides it, so its values come back with it.
  - Policies `story_characters_select_own` and `story_character_fields_select_own`: only the writer reads them. Every write goes through a function.
  - Pictures: a private `atlas-images` bucket. Every upload goes through the picture check (rule 19), and only the writer and moderation staff can read the files. Removing a picture lets the writer delete the file, unless a moderator or the authorities still need it.
  - `story_plan()` now also returns the cast count and the three characters edited last.
- **Screens** (`src/features/atlas/`):
  - `/plan/s/:slug/characters`: "New character" makes one and opens its sheet. The cast is grouped by role and filtered by typing (accents and case don't matter).
  - The sheet sits beside the list on a laptop and below it on a phone. It has the name and role, the picture, the four groups, the first appearance, your own fields and a two-step Delete. Every field saves by itself.
  - A row of sections (At a glance, Characters) sits under the Story Atlas top bar.
  - The at-a-glance page gains a Characters card (count, recently edited, Open characters) and "Your character fields" (add, remove, bring back).
- **Pictures feature:** `uploadAtlasPicture()` and `deleteStoredPicture()` in `src/features/pictures/api/pictures.ts`.
- **Text:** `nav`, `characters` and `fieldsSection` in `atlas.json`, ro and en.
- **Moved to later parts:**
  - "Appears in" and "Mentioned in" (S1-E17-12) need the chapter planning fields (part e) and cross-links (part h).
  - Relationships, which go with a deleted character, come in part c.

## How it was tested

- **pgTAP `191-story-characters` (36 tests):**
  - New character, each sheet field saving by itself, unknown fields, other stories' chapters and over-long text refused;
  - custom fields shown, hidden with their values kept;
  - allowed and denied tests for all five policies (another member and a moderator are denied);
  - the picture shows only once its check passed, a removed picture's file can be deleted and a live one can't;
  - deleting a character takes its picture, the cast count, and no user ID in any answer.
- **021-signed-out-reads:** lists the two new tables.
- **Vitest:** `characterInitials` and `castGroups`.
- **e2e `atlas-characters.spec.ts` (17 tests):**
  - New character, fields saving and surviving a reload, a long box growing;
  - grouping, filtering, beside on a laptop and below on a phone with no sideways scroll;
  - your own field removed and brought back with its value;
  - a picture passing its check, its alt text, and Remove deleting the file;
  - Delete asking twice;
  - axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye at 1440 (light, en) and 390 (night, en), for the Characters page and the at-a-glance page.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 875 of 875.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 101 files, 2,175 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `atlas-characters` passes 17 of 17. `atlas-at-a-glance`, `chapter-pictures`, `picture-check` and `story-settings` pass 66 of 66, all with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migrations reach staging through Supabase's GitHub integration. Character pictures follow the existing `picture_uploads` GO-LIVE step.

## Board mismatches

There is no board for Story Atlas yet. The pages follow the writer screens' cards, fonts and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- A picture file whose delete fails (a dropped connection) stays in Storage, marked deleted and never shown. A nightly sweep of deleted `atlas-images` files would tidy these up.
- The moderation queue labels a flagged character picture "Picture (atlas_image)"; a friendlier label can come with S1-E17-34.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
