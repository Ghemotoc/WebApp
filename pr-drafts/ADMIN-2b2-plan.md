# ADMIN-2b2 plan: version history, Restore and removing a passage (S1-E11-08, part 08b)

Branch: claude/admin2-b2-history-restore. Part of #106 (12b3, hiding a title or cover, closes it).

## Scope
- Version history on the staff story page: every staff change newest first, who, when, before and after, the reason, what a restore undid.
- Restore on any version: brings back the "before" values as a new version with its own reason; the writer is told (statement when it restricts, notification otherwise).
- Remove an exact passage from a published chapter: the words open read-only (staff can't type), staff select the passage, give a reason and optionally a case reference; the marker in the story's language replaces it; the original goes into `removed_passages`, readable only by staff who may change stories (safeguarding cases need the permission), each read logged.
- Moved to 12b3: hiding a title or cover and the cover on the staff page (touches every public read of titles).

## Database (migration 20261213100001_admin2_b2_history_and_passages.sql)
- `story_revisions`: change kind `passage`, `restores_revision_id`, `created_at` default clock_timestamp().
- Setting `removed_passage_marker` (ro, en).
- Table `removed_passages` (kind: staff), policy `removed_passages_select_staff`, grants, test 021 line.
- Functions: `admin_chapter_text`, `admin_passage_place`, `admin_passage_case`, `admin_swap_chapter_words`, `admin_remove_chapter_passage`, `admin_put_back_passage`, `admin_restore_story_revision`, `admin_removed_passage`, `admin_story_history_json`; `admin_story_overview` gains `history` and `has_published_text`.

## Tests
- pgTAP 240 (46 checks), unit `storyVersionText.test.ts`, notification text test, e2e `staff-story-history.spec.ts`.

## OPEN, not chosen (rule 13)
- How long a removed passage's original is kept: no purge job; retention.md says OPEN.
