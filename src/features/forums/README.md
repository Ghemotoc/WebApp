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
- Staff (`/staff/forums`, owner and admin): `api/forumAdmin.ts` (`admin_list_forums()`,
  `admin_save_forum()`, `admin_delete_forum()`), `hooks/useForumAdmin.ts`, `lib/forumForm.ts`,
  and `components/staff/` (`ForumsAdminPage`, `ForumAdminRow`, `ForumForm` with
  `ForumNameFields` and `ForumPlaceFields`, `RemoveForumForm`).
- Texts: the `forums` namespace (`useForumsTranslation()`) and `forumsAdmin` for staff. Forum
  names themselves are staff content in `forum_names`, never in the locale files.

The database half is `supabase/migrations/…_forums1_a_forum_categories.sql` and
`…_forums1_b_threads_and_posts.sql` and `…_forums1_c_quotes.sql`.
