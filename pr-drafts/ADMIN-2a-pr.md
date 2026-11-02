<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #105

Bundle 12 ADMIN-2, part a: every story in the admin site (S1-E11-07, screen 8.10). Part b (S1-E11-08) adds the controls to change a story on the story page this part builds.

## What changed
- **Staff › Stories (criteria 1 to 3).** A new "Stories" item in the staff menu opens `/staff/stories`: every story on the platform, the latest update first, 50 a page.
  - Search by part of the title, by the writer's username (look-alike letters folded, "@" optional), by an earlier username (from the audit log, so old work is still found) or by the owner's user ID, full or the 8-character short form.
  - Filters: status (All, Draft, Published, Hidden, Removed, as chips), category, story language, rating, where it can be read (everyone or one class only), Open reports and Writers under 18. The search and filters live in the address, so Back from a story returns to the same list and a link can be shared with a colleague.
  - Each row: the title (a link), the writer's username, "under 18" when they are, and the account's status when it isn't active; the owner's short user ID with Copy user ID; category, language, status, who can read it, rating, chapters, last update and open reports (closed ones under them). Never a year of birth, an email or a chapter's words.
  - No bulk actions (criterion 5): each change will be made on one story.
- **One story's page.** `/staff/stories/:storyId` shows the writer (linking to their account in Users), the short user ID, status, who can read it, rating, category, language, comments, dates, report counts, the blurb and the chapter list (number, title once published, status, hidden or not, words published, date). A draft chapter shows no title, and no chapter's words appear (criterion 4). A story its writer deleted no longer shows in the list but still opens here, marked as deleted, for a case or a data request.
- **Who may use it (architecture 1.8.3).** Owner, admin and moderator act; support staff look only, and the story page tells them so; the content editor and members are refused by the database, and the page says so. Both database functions check `staff_may()` themselves.
- **Database.** One migration, no new tables: `admin_search_stories()` and `admin_story_overview()`, with internal helpers whose execute rights are revoked.

## How it was tested
- Database test `238-every-story-in-admin.test.sql` (32 checks): owner, moderator and support list stories; the content editor, a member and a signed-out visitor are refused; search by title, `@username`, an earlier username and a user ID; every filter; the report count, the "under 18" flag and a moderator's hide in a row; a row never carries a year of birth, email or text; paging; the overview's chapter list and `can_change`; a deleted story leaves the list but still opens.
- Unit tests `src/features/staff/lib/staffStoryFilters.test.ts`: the filters read back from the address, hand-typed rubbish is ignored, the row reader.
- Browser test `e2e/staff-stories.spec.ts`: the moderator opens Stories from the menu, searches by title and username, filters by writers under 18 and by language, opens a story and goes back; support sees "look only"; the content editor is refused; axe and no sideways scrolling at 390, 768 and 1440 px in light and night, Romanian and English (26 tests).
- Screenshots at 1440 and 390 px checked by eye.

## Local check run
LOCALRUN

GitHub Actions is blocked by billing, so this pull request is merged on local checks and Cloudflare's build (Robert's choice, 2 Nov 2026, 15:20 UTC).

## By hand
Nothing: no SQL top-up and no new secrets.

## Board mismatches
- AdminStories (8.10) draws a small cover beside each title. Staff screens stay plain, so the list has none.
- The board's "Read on: Web and app / App only" column: app-only stories aren't built yet (S1-E3-08 is after March), so the column is "Read by: Everyone / One class only" (class-only stories, S1-E8-11), and the story's "where it can be read" filter uses the same two values.
- The board's language filter label "Language" is "Story language" here, so screen readers don't confuse it with the interface language menu.
- The board has no rating filter; the story asks for one, so it is there.
All four are in `docs/board-fixes.md`.

## Questions for Robert
- None needing an answer now. The story's proposal that a draft's text opens only from a case or a data request, with the reason logged, stands: nothing in this part opens a draft's words.

## Follow-ups
- The staff menu underlines an area only on its exact address, so on a story's page (and an account's page in Users) no menu item is underlined. Worth changing for every area at once.
- The board's footer cards ("One owner per story", "Data requests") wait for Data requests (part c), so the link has somewhere to go.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
