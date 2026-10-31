# ATLAS-d plan: the story bible, its sections and entries (S1-E17-17 and S1-E17-18)

- Migration `20261104130001_s1_e17_17_bible.sql`: `story_bible_sections` (seven default presets plus the writer's own, ordered, deferrable unique position) and `story_bible_entries` (title, tags, Markdown body); policies `story_bible_sections_select_own` and `story_bible_entries_select_own`; `make_bible_sections()` called by `make_story_plan()` plus a backfill; `story_bible()`; section functions (add, rename, move, delete when empty) and entry functions (create, update, delete); `check_bible_text()` and `clean_bible_tags()`.
- pgTAP `193-story-bible`: allowed and denied for both policies, the defaults, every limit and refusal.
- Screens: `/plan/s/:slug/bible/:entryId?` with `BibleContents`, `BibleEntryView` (reading with `BibleMarkdown`, editing with `BibleEntryEditor`) and `BibleSectionsManager` (rename, drag or Up and Down, two-step Delete).
- Lib with unit tests: `bibleTags`.
- e2e `atlas-bible.spec.ts`: every acceptance criterion, plus axe at 390, 768 and 1440, light and night, ro and en.
