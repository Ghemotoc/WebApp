<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Part of S1-E17 (Story Atlas, stories in #230). The story issues for S1-E17 don't exist yet, because the "Sync story issues" job can't run while GitHub Actions billing is failing.

Bundle 5b ATLAS, part d: S1-E17-17 and S1-E17-18.

## What changed

- **Database:** migration `20261104130001_s1_e17_17_bible.sql`.
  - `story_bible_sections`: a story's bible sections in order. Every plan starts with seven defaults (Premise and themes, World and places, Magic and rules, Cosmology and belief, Factions and organisations, History, Glossary), made by `make_bible_sections()` from `make_story_plan()` and backfilled for plans that already exist. A default section left without a name shows its translated default name.
  - `story_bible_entries`: title, up to 20 tags and a Markdown body of up to 100,000 characters, refused on save if it holds HTML or a script link (`check_bible_text()`).
  - Policies `story_bible_sections_select_own` and `story_bible_entries_select_own`: only the writer reads them. Writes go through `add_bible_section()` (at most 50), `rename_bible_section()`, `move_bible_section()`, `delete_bible_section()` (refused while it has entries), `create_bible_entry()` (at most 2,000), `update_bible_entry()` and `delete_bible_entry()`. `story_bible(slug)` reads it all.
- **Screens** (`src/features/atlas/`):
  - New `/plan/s/:slug/bible`, the fourth item in the Story Atlas sections: the contents (each section, its entries and "New entry") beside the open entry or "Manage sections".
  - "New entry" makes an entry and opens it ready to write; title, tags, section and text save by themselves.
  - Reading mode shows the section, the tags as pills and the text as Markdown with clickable, safe links (`rel="nofollow ugc noopener"`), with an Edit toggle (`aria-pressed`).
  - "Manage sections": rename, move by dragging or with Up and Down, Delete (asks twice, and only an empty section goes), and add a section.
  - `TwoStepDelete` is a small shared delete that asks twice; entries use it too.
- **Text:** `nav.bible` and `bible` in `atlas.json`, ro and en.

## How it was tested

- **pgTAP `193-story-bible` (24 tests):** allowed and denied for both policies (another member and a moderator denied), the seven defaults on a new plan, add, rename, move and delete sections (not while they hold entries), create, update, move and delete entries, HTML and script links and unknown changes refused, tags cleaned, a move to another writer's section refused, the bible gone with a purged story and no user ID in `story_bible()`.
- **021-signed-out-reads:** lists both new tables.
- **Vitest:** `bibleTags`.
- **e2e `atlas-bible.spec.ts` (27 tests):**
  - the seven defaults; rename (an empty name brings the default back); add a section; Up and dragging move it;
  - a new entry opens ready to write, saves by itself, reads with bold text and a safe clickable link, its tags de-duplicated; moving it to another section puts it there;
  - deleting a section with entries is refused; deleting the entry and then the section each ask twice;
  - axe, no sideways scroll and no doodle overlap at 390, 768 and 1440 px, light and night, ro and en, with an entry open and with the sections.
- **Screenshots:** checked by eye at 1440 (light), 768 (night) and 390 (light), the sections, an entry and editing.

## Local check run

Run on Node 24.

- **Static checks:** lint, typecheck, types:check, i18n:check and migrations:check all pass.
- **Unit tests:** `npx vitest run` passes 898 of 898.
- **Database:** `npx supabase db reset` then `npx supabase test db` passes 103 files, 2,214 tests.
- **Functions:** `npx wrangler pages functions build` succeeds.
- **e2e:** `atlas-bible`, `atlas-characters`, `atlas-connections` and `atlas-at-a-glance` pass 78 of 78, with `--workers=1`.
- **Full run:** the full e2e suite runs once per bundle, before ATLAS part i merges.

## By hand

Nothing. The migration reaches staging through Supabase's GitHub integration, and its backfill gives existing plans the default sections.

## Board mismatches

There is no board for Story Atlas yet. The page follows the writer screens' cards, fonts and pills, with no doodles.

## Follow-ups

- Story issues for S1-E17 once the Sync story issues job can run.
- `[[Name]]` cross-links inside entries come in part h (S1-E17-31).
- A search box over entries could help once a bible grows past a few dozen entries.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
