# FORUMS-1a plan: forum categories, forums and subforums (S1-E8-01, issue #67)

- Migration `20261125100001_forums1_a_forum_categories.sql`: `forum_accent` enum, `forums` (one table, levels 0 to 2 set by trigger), `forum_names` (per interface language), RLS read-only public, explicit grants; `forum_index(language_code)` with 0 counts until part b; `admin_list_forums()`, `admin_save_forum()`, `admin_delete_forum()` (settings area, audit log); seed of the board's 4 categories, 11 forums, 4 subforums in ro and en.
- Tests: 221 (26), 021 gains forums and forum_names.
- Front end: `src/features/forums/` (index page /forums, forum page /forums/:forumSlug, staff page /staff/forums), Forums in the top bar, Forums in the staff menu (settings area).
- e2e: `e2e/forums.spec.ts`; staff menu lists in staff-shell and epic-s1-e11 gain "Forums".
- Criteria: 1 (staff set name, description, order, parent, two levels) → 221 section 4, e2e admin test; 2 (pinned categories first, counts and latest post) → 221 sections 1 and 3, forumTree tests, e2e index test; 3 (never archived) → 221 section 6, the never-close line.
