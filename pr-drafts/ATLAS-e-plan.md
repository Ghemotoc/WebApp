# ATLAS-e plan: chapter planning and the writing view (S1-E17-23 to S1-E17-26, and "Appears in" of S1-E17-12)

- Migration `20261104140001_s1_e17_24_chapter_plans.sql`: `chapter_plans` (one private row per chapter, made by a trigger on chapters and backfilled), `chapter_plan_characters`, `chapter_scenes`; one select-own policy each; `chapter_plan()`, `story_chapter_progress()`, `character_appearances()`, `update_chapter_plan()`, `set_chapter_character_present()` and the scene functions.
- The planning is a separate table, not columns on `chapters`, because readers may read a published chapter's row.
- pgTAP `194-chapter-plans`: allowed and denied for the three policies, every check, the cascades.
- Screens inside the existing chapter editor: `WritingChapterList` (left), `ChapterPlanPanel` (under the aside), `ChapterWordsLine` (words / target and the long-chapter warning), `FocusModeToggle`; `CharacterAppearancesSection` on the sheet.
- Libs with unit tests: `optionalNumbers`, `chapterLength`.
- e2e `atlas-chapter-planning.spec.ts`, plus the editor's own specs against the new layout.
