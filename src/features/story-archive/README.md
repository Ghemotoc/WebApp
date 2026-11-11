# story-archive

Archived stories (bundle ARCHIVE-1; Robert, 11 Nov 2026, 19:47 to 19:52 UTC).

When an account closes because nobody used it for 5 years, its stories, chapters and Story Atlas go to a private archive for 5 more years just before the account is deleted (`archive_account_stories()`, called by `purge_closed_accounts()`). Nobody reads the archive, staff included. Pictures are not archived. An account its owner chose to delete is never archived.

The writer brings the stories back from a new account with the same, confirmed email address:

- `api/storyArchive.ts`: the calls to `my_story_archive()` (do stories wait for this email?) and `claim_story_archive()` (year of birth plus one of pen name, username or a story's title).
- `hooks/useStoryArchive.ts`: the two calls as TanStack Query hooks; after stories come back, every cached list is read again.
- `components/ArchivedStoriesSection.tsx`: the Settings panel (`/settings#archived-stories`, in the Download data group). It shows nothing unless stories wait. `ArchivedStoriesForm.tsx` is its form and `ArchiveClaimResult.tsx` the line that says what happened.
- `registerStoryArchiveTranslations.ts`: the `storyArchive` text, loaded with this folder.

Stories come back as private drafts. Three wrong tries lock the form for a day. The database side is `supabase/migrations/…_archive1_story_archive.sql`; tests `371`, `372` and `e2e/story-archive.spec.ts`.
