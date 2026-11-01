<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #68

Bundle 9 FORUMS-1, part b: threads and posts with safe formatting (S1-E8-02).

## What changed
- **Threads in every forum and subforum.** A forum's page now lists its threads, latest activity first (Q45), with who started each, its replies and the latest post. "Start a thread" opens `/forums/<forum>/new` with a title and the first post. Categories hold forums, not threads.
- **The thread page, `/forums/<forum>/<number>`.** Board 5.2's heading, the posts in order and the reply card. A "This thread" panel shows Replies, Writers taking part and Last reply, with "Something wrong?" under it. Anyone can read; signed out, the card says to log in.
- **Numbers and permalinks (criterion 3).** Every post is #1, #2… in the order written. A number is never reused or moved: a deleted post keeps its place as "Post deleted", a removed one as "[Removed by the moderation team]". Each number is a link (`?post=7`) that opens the thread at that post and focuses it.
- **Safe formatting (criteria 1 and 2).** Posts take bold, italic, links, quotes and lists ("Simple formatting only", board 5.2). The server refuses any HTML tag (so no script, iframe or style) and any javascript:, data: or vbscript: link, with plain words under the field. The page cleans the text again when it shows it, and every link gets `rel="nofollow ugc noopener"`.
- **Editing (criterion 4).** Authors edit their own posts in place; on #1 they can fix the title too. The post then shows "Edited" with the time. The earlier words and title are kept, and only moderators see them, under "Earlier versions" on the post.
- **Deleting.** Authors delete their own posts. Deleting #1 of a thread nobody answered deletes the thread.
- **Reporting (rule 6).** Threads and posts are new reportable types. Report sits on the thread and on every post by someone else. Moderators can hide or remove either, and blocks hide posts both ways.
- **The forum index** now counts threads and posts and shows each forum's latest post. Staff can't remove a forum that still has threads.
- **The post limit.** As for comments: 5 posts an hour in an account's first day, 60 after (proposals, settings).
- **Data rights.** Download my data includes the person's threads, posts and earlier versions. Closing an account turns its posts into "Post deleted" at once and hides threads only they posted in; cancelling brings them back. Deleting for good erases the words, keeping only what a case holds. Deleted posts lose their words for good after 30 days (nightly `purge-deleted-forum-posts`, docs/retention.md).
- **Docs:** `docs/code-tour.md`, the forums README, `docs/retention.md` and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/222-forum-threads-and-posts.test.sql` (45 tests) covers numbering, the HTML and link refusals and the account gate. It also covers the post limit, editing and history, the six policies (allowed and denied), blocks, hiding and removing, deleting, reporting, the index and the forum removal check. Test 021 knows the three new tables; 221's never-close check skips the purge job.
- Unit: `ForumPostText.test.tsx` (formatting, no script/iframe/style, safe links) and `forumWrites.test.ts` (refusals into words).
- `e2e/forum-threads.spec.ts`: start a thread, reply with HTML (refused) and with a link (#2, safe rel), the permalink, a visitor and Report, edit and Earlier versions, delete, plus axe on the forum, thread and new-thread pages at 390, 768 and 1440 px, light and night, ro and en.

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- Board 5.2 shows Views, rank chips, signatures, votes, Quote, Pinned and Locked, "New since your last visit", Following, Don't bump, Preview, formatting buttons and ads. They arrive with their own parts or stories (listed in docs/board-fixes.md). Views are left out for now: no story asks for them.
- "Show 19 more replies" is "Show more replies" (20 at a time).
- The index's "New thread" is "Start a thread" on each forum's page.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **Pictures in posts** are OPEN in the story; posts are text only for now.
- **Limits:** a post can have up to 15,000 characters (about the board's 2,000 words) and a title up to 120. Both are settings.
- **A deleted account's threads:** a thread with other people's replies stays, with its title, and its starter shows as "Deleted account". Board 6.3 says "Your forum posts stay, shown as “Deleted user”"; I erase the words instead, as for comments (Q47). Say if posts should stay.
- **Editing the title** is allowed only through post #1, by its author. Edits don't move a thread up the list; only new posts do.

## Follow-ups
- The moderation case page shows a reported post's summary; a panel with its earlier versions (already in `case_item_content()`) could follow with the moderation stories.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
