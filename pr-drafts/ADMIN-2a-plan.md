# ADMIN-2a plan: every story in the admin site (S1-E11-07, #105)

- Migration `20261211100001_admin2_a_every_story.sql`: no new tables. Internal helpers `admin_story_status()`, `admin_story_owner_is_minor()`, `admin_story_report_counts()`, `admin_story_row()`, `admin_story_matches()`; public `admin_search_stories()` (staff_may('stories','view'), 50 a page, filters for status, category, language, rating, where it can be read, open reports, writers under 18; search by title, current or earlier username, user ID) and `admin_story_overview()` (details and chapter list, can_change from staff_may('story_changes')).
- Database test 238: who may list (owner, moderator, support allowed; content editor, member, anon refused), each search kind, each filter, row never has a year, email or text, deleted stories leave the list but still open, overview can_change.
- Screens: /staff/stories (StaffStoriesPage, StaffStoryFiltersBar, StaffStoryResults) and /staff/stories/:storyId (StaffStoryPage, StaffStoryChapters); hooks useStaffStories (filters in the address), useStaffStory, useStaffStoryWords; api/staffStories.ts; menu entry "Stories".
- Tests: unit (address helpers, row reader), e2e/staff-stories.spec.ts (moderator journey, support view-only, editor refused, axe at 390, 768, 1440).
- Docs: staff README, code tour, board-fixes row.
