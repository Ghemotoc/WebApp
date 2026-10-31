<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part h: S1-E17-30 (search everything), S1-E17-31 (cross-links with [[Name]]) and the "Mentioned in" half of S1-E17-12. It also finishes S1-E17-28's "[[name]] links to a character, entry or chapter".

## What changed

- **Database:** migration `20261104170001_s1_e17_30_search_and_links.sql`. No new tables, so no new policies: the functions read the earlier parts' tables for the caller's own story only.
  - `search_story(slug, query)`: searches the open story's characters (every sheet field and the writer's own fields), bible entries, chapters (the manuscript and the plan), scenes, questions and ideas, timeline events and marketing notes. Matching ignores capitals and common accents (`atlas_fold()`, letter for letter). Each match comes with a snippet of about 160 characters around it (`atlas_snippet()`); at most 20 per type; a query under two letters finds nothing.
  - `story_link_targets(slug)`: what a `[[Name]]` can point to: characters by name and every "also known as", bible entries and titled chapters by title.
  - `character_mentions(character_id)`: the entries, chapters, scenes, ideas, events and other characters that hold `[[the name]]` or `[[an alias]]` in any capitals, never the character's own sheet.
- **Search:** a search box in the Story Atlas top bar on every page. Enter opens `/plan/s/:slug/search?q=…`: the results grouped by type with counts, each a link to its item and a snippet with the match in bold and underlined (not colour alone). A note opens on the Ideas page with every note shown and scrolled into view; an event opens the timeline; a marketing note opens its field.
- **Cross-links:** `[[Name]]` resolves by name, alias or title, ignoring capitals. In reading views (bible entries, timeline events) it is a link; a name nothing has yet shows with a dashed underline and "(not found yet)". Under editing fields (a bible entry's text, a note and its outcome, an event's description) the links show as chips to choose, or a grey "Name: not found yet" pill. While the names load, links show as plain words, so nothing flashes "not found yet".
- **"Mentioned in"** on the character sheet, under "Appears in", each place a link with its kind in words.
- **Text:** `search` and `links` in `atlas.json`, ro and en.

## How it was tested

- **pgTAP `197-search-and-links` (16 tests):** every type found and grouped, ignoring capitals; accents ignored and the manuscript searched; the snippet keeping the original letters; sheet and custom fields searched; a scene with its chapter; a long text's snippet cut with … at both ends; under two letters finds nothing; at most 20 per type; link targets with aliases and no untitled chapter; mentions in any capitals everywhere but the character's own sheet; plain text without brackets not a mention; no user ID; another member gets not_found; signed out refused.
- **Vitest:** `crossLinks`, `highlightMatches`, `itemAddress` and `searchGroups`.
- **e2e `atlas-search-links.spec.ts` (17 tests):** the box in the top bar, grouped results with the mark in bold, accents ignored and a chapter result opening its editor; a note result opening with All shown, its chip opening the character; a short query asking for more; a bible entry's alias link opening the character and an unknown name reading "not found yet", with the chips while editing; an event's link; "Mentioned in" listing and opening; axe, no sideways scroll and no doodle overlap on the search page at 390, 768 and 1440 px, light and night, ro and en.
- **Screenshots:** checked by eye: the search page, a bible entry with links and a sheet with "Mentioned in", at 1440 (light, en) and 390 (night, ro).

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 936 of 936.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 107 files, 2,304 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** the new spec, the seven other Story Atlas specs and chapter-editor pass 177 of 177, with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration.

## Board mismatches

- There is no board for Story Atlas yet. The search page and links follow the Atlas pages' cards, links and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- Search reads every text with `strpos`, which is plenty for one story; a story with hundreds of long chapters may want a trigram index later.
- `[[Name]]` links inside the chapter manuscript count as mentions but aren't drawn as links in the editor, because the manuscript is what readers read; the plan panel's summary could show chips later.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
