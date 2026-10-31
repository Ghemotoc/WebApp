<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part c: S1-E17-14, S1-E17-15 and S1-E17-16.

## What changed

- **Database:** migration `20261104120001_s1_e17_14_relationships.sql`.
  - `story_character_relationships`: how two characters of one story are connected, read from the first to the second, with one of the 13 types of S1-E17-14 (custom needs the writer's own label) and an optional note. Deleting a character deletes its relationships.
  - Policy `story_character_relationships_select_own`: only the writer reads them. Writes go through `add_character_relationship()` (both characters the writer's and in the same story, at most 2,000 per story) and `delete_character_relationship()`.
  - `story_cast()` now also returns the relationships.
- **Screens** (`src/features/atlas/`):
  - Each character sheet gains "Relationships": every relationship the character is in, either way round, with a two-step Delete, and a form to add one (type, other character, optional note).
  - New `/plan/s/:slug/connections`, the third item in the Story Atlas sections: Add a relationship (both characters picked), the relationship map, the family tree and All relationships.
  - The map: characters as nodes on a circle, each a real link to the sheet; relationships as labelled, arrowed lines. Each category (family, love, lineage, allies, conflict, other) has its own colour and its own line style; the category switches show a sample of each line and act as the legend. On a phone the map scrolls inside its own region.
  - The family tree: generations top to bottom, partners side by side, elbow lines from parents to children; "Include turned or made" counts makers (drawn dotted); a note says how many characters are left off; screen readers get the generations as a list.
- **Design tokens:** `--atlas-line-*` in light and night, each checked at 3:1 on cards in `contrast-pairs.ts`.
- **Text:** `nav.connections` and `connections` in `atlas.json`, ro and en (one sentence per type, worded so Romanian reads naturally whatever the characters' gender).

## How it was tested

- **pgTAP `192-character-relationships` (15 tests):** allowed and denied for the policy (another member and a moderator denied), add and delete, the same character twice, different stories, an unknown type, a missing or extra label, an over-long note, someone else's characters, the cascade when a character is deleted, and the relationships in `story_cast()`.
- **021-signed-out-reads:** lists the new table.
- **Vitest:** `relationshipCategories`, `relationshipMap`, `familyTree` and `familyTreeLayout`.
- **e2e `atlas-connections.spec.ts` (17 tests):**
  - a relationship added on a sheet shows on both sheets; the type list has all 13 types; custom needs its label;
  - the map draws every relationship, turning Conflict off hides its line, and a node opens the sheet by keyboard;
  - at 390 px the map scrolls in its region and the page doesn't scroll sideways;
  - the family tree's generations, "Include turned or made" and the left-off note;
  - Delete asks twice and the relationship leaves both sheets;
  - axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye at 1440 (light), 768 (night) and the sheet's section. The first pass showed the line samples vanishing on switched-on chips and labels crowding on a small circle; the samples now sit on the card colour and the circle grows with the cast.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 894 of 894.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 102 files, 2,190 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `atlas-connections` passes 17 of 17; `atlas-characters` and `atlas-at-a-glance` pass 34 of 34, all with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration.

## Board mismatches

There is no board for Story Atlas yet. The pages follow the writer screens' cards, fonts and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- With many characters (30 or more) the map's circle gets large; a zoom control or a layout that clusters families could come later.
- Relationships become public (with a "Keep private" switch each) in part i (S1-E17-32 and 33).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
