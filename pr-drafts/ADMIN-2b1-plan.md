# ADMIN-2b1 plan: staff open and change a story (S1-E11-08, part 08a; issue #106)

- Migration `20261212100001_admin2_b1_enums.sql`: notification_kind `story_changed_by_staff`.
- Migration `20261212100002_admin2_b1_change_story.sql`: tables `story_revisions` and `story_restrictions` (kind staff, RLS, grants); `is_story_restricted()`; `listed_stories()` leaves restricted stories out of public lists; `admin_change_story_settings()`, `admin_set_story_visibility()`, `admin_set_chapter_visibility()` with shared internal helpers; notifications.story_revision_id, `notify()`, `notification_category()`, `notification_json()`; overview carries settings and visibility; status 'restricted'.
- Tests: database 239 (49 checks), 021 lines, unit tests for the diff and notification text, e2e staff-story-changes.
- Screen: visibility, settings and chapter controls on StaffStoryPage; notification text for writers.
- Left for 12b2: version history list and Restore, passage removal, hiding a title or cover.
