# ADMIN-2b3 plan: staff hide a story's title or cover (S1-E11-08, last part)

Criterion: "Given a title or cover that breaks the rules, when staff act, then they can hide the cover (the automatic cover from S1-E3-13 shows instead) or hide the title on public screens behind 'Title hidden by the moderation team' until the writer changes it; staff never write a new title." Also criterion 1: staff see the cover.

## Migrations
- `20261214100001_admin2_b3_enums.sql`: statement_action `title_hidden`, `cover_hidden`.
- `20261214100002_admin2_b3_hide_title_cover.sql`:
  - `stories.title_hidden_at`, `cover_hidden_at`; trigger `stories_clear_hidden_presentation` clears them when the writer changes the title or cover.
  - Setting `hidden_title_marker` (ro, en) and `hidden_title_marker()`.
  - `story_as_shown(stories)`: masks title and cover unless the caller is the writer or has `staff_may('stories','view')`.
  - Rewritten to read the story as shown: `listed_stories`, `reader_visible_story`, `story_card_json`, `get_story_page`, `get_link_preview`, `profile_story_cards`, `export_library_of`, `public_plan_json`, `notification_json`; `story_search_text` drops a hidden title; `story_cover_picture` and `picture_is_visible` hold back a hidden upload.
  - `story_revisions.change_kind` gains `presentation`; `admin_set_story_presentation(story, part, state, reason_code, reason_text)`; restore branch; overview gains slug, cover, title_hidden, cover_hidden.
- No new table, so no new policies; `picture_is_visible()` (policy `pictures_select_visible`) gets an allowed and a denied test.

## Tests
- pgTAP `241-hide-title-and-cover.test.sql`: who may hide; reasons; bad part; automatic cover; nothing changed; the version, statement and audit log; marker on card, page, lists, reader, link preview; search; writer and staff see the real title; show again sends a notification; Restore; writer changing title or cover clears it; hidden cover masked; Storage refuses a hidden upload (allowed and denied).
- Unit: storyVersionText (presentation), notificationText (title or cover shown again).
- E2E `staff-story-presentation.spec.ts`: hide title, reader sees marker; hide cover; history; show again; support read-only; axe at 390, 768 and 1440.

## Screens
- `StaffStoryCover` (real cover, pill while hidden), `StaffStoryPresentationForm` ("Title and cover"), a "Title hidden from readers" pill under the heading.
