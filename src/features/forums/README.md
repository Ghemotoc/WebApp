# forums

The forums: categories, forums and subforums, the forum index and one forum's page, and the
staff page where the owner and admins add, name, order, pin and remove them (bundle FORUMS-1,
part a; story S1-E8-01; board 5.1 Forums), and the threads and posts in them (part b; story
S1-E8-02; board 5.2 Forum thread).

- `api/forumIndex.ts`: `forum_index()`, the index in one language (anyone).
- `lib/forumTree.ts`: the order (pinned categories first, then by latest activity, Q45), the
  forums inside one forum and the breadcrumb path.
- `hooks/useForumIndex.ts`: the index, cached per language.
- `components/ForumsPage.tsx` (`/forums`): `ForumCategorySection` → `ForumRow` (`ForumLatestPost`),
  and `ForumRulesCard`.
- `components/ForumPage.tsx` (`/forums/:forumSlug`): `ForumBreadcrumb`, the forums inside it and
  `ThreadList` (`ThreadRow`).
- Threads and posts (part b): `api/forumThreads.ts` (`forum_thread_list()`, `forum_thread()`),
  `api/forumWrites.ts` (start, reply, edit, delete, earlier versions), `hooks/useForumThreads.ts`,
  `hooks/useForumWrites.ts`, `lib/forumFailures.ts`, `lib/forumDates.ts`, `lib/forumPeople.ts`;
  `components/NewThreadPage.tsx` (`/forums/:forumSlug/new`) and `components/ThreadPage.tsx`
  (`/forums/:forumSlug/:threadNumber?post=N`) with `ThreadHeader`, `ForumPostCard`
  (`ForumPostText`, `PostActions`, `PostEditForm`, `PostHistory`), `ReplyForm`, `PostEditor` and
  `ThreadSidePanel`.
- Quotes and the quick reply (S1-E8-03, FORUMS-1c): `hooks/useQuotePicks.ts`,
  `components/ForumQuoteBlock.tsx`, `lib/forumAddresses.ts`; "Quote" and "Add to quotes" in
  `PostActions`, the picked quotes in `ReplyForm`.
- Read and unread (S1-E8-04, FORUMS-1d): `api/forumReads.ts`, `hooks/useForumReads.ts`,
  `components/UnreadDot.tsx`, `MarkReadButton.tsx` and `NewForYou.tsx`.
- Sticky, locked and "Don't bump" (S1-E8-05, FORUMS-1e): `api/forumModeration.ts`,
  `hooks/useForumModeration.ts`, `components/ThreadModeration.tsx` (moderators only) and
  `LockedThreadNote.tsx`; the pills in `ThreadRow` and "Don't bump" in `ReplyForm`.
- Search (S1-E8-10, FORUMS-1f): `api/forumSearch.ts`, `hooks/useForumSearch.ts`,
  `lib/forumSearchAddress.ts`, `components/ForumSearchForm.tsx`, `ForumSearchPage.tsx`
  (`/forums/search`) and `ForumSearchResultRow.tsx`.
- Staff (`/staff/forums`, owner and admin): `api/forumAdmin.ts` (`admin_list_forums()`,
  `admin_save_forum()`, `admin_delete_forum()`), `hooks/useForumAdmin.ts`, `lib/forumForm.ts`,
  and `components/staff/` (`ForumsAdminPage`, `ForumAdminRow`, `ForumForm` with
  `ForumNameFields` and `ForumPlaceFields`, `RemoveForumForm`).
- Texts: the `forums` namespace (`useForumsTranslation()`) and `forumsAdmin` for staff. Forum
  names themselves are staff content in `forum_names`, never in the locale files.

The database half is `supabase/migrations/…_forums1_a_forum_categories.sql` and
`…_forums1_b_threads_and_posts.sql`, `…_forums1_c_quotes.sql` and `…_forums1_d_read_and_unread.sql`.
- Spaces (S1-E8-06, FORUMS-2a): a space's threads live in its own hidden forum (`space-<name>`);
  `lib/spaceForums.ts` finds the space from the address, `NewThreadForm` is shared with the
  space's new-thread page, `ForumBreadcrumb` and `SpaceReplyNote` show the way through the space.
  The space screens themselves are in `src/features/spaces/`.
- Signatures (S1-E8-08, FORUMS-2d): `api/forumSignatures.ts`, `hooks/useForumSignatures.ts`,
  `lib/signatureLimits.ts`, and `components/SignatureBody.tsx` (under posts and on profiles),
  `ProfileSignatureCard.tsx`, `SignatureSettingsSection.tsx` with `SignatureWordsForm.tsx` and
  `SignaturePictureControls.tsx` (Settings), `ChangeRequestNotice.tsx` and
  `CustomisationChangeForm.tsx` (a moderator's request to change a signature or a banner).
- Ranks (S1-E8-09, FORUMS-2e): `lib/writerRanks.ts`, `api/writerRanks.ts`,
  `hooks/useWriterRank.ts`, and `components/RankChip.tsx` (on profiles and posts),
  `ProfileRankChip.tsx`, `RankPanel.tsx` with `RankLadder.tsx` and `RankProgressBar.tsx`, and
  `RankSticker.tsx` (the sticker on the profile picture).
