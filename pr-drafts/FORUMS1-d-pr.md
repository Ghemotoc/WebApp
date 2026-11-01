<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #70

Bundle 9 FORUMS-1, part d: read and unread tracking (S1-E8-04).

## What changed
- **New posts are marked (criterion 1).** A signed-in reader sees board 5.1's dot: filled for "New posts since your last visit", a ring for "No new posts". It sits on every forum on the index (a forum counts the forums inside it too) and on every thread in a forum's list. Screen readers hear the words, so the state never rests on colour.
- **Opening lands on the first new post (criterion 2).** An unread thread's link in the list goes to its first new post (`?post=7`), which the page scrolls to and focuses. Whatever is on screen in a thread then counts as read, and that point only moves forward, so an old permalink never makes newer posts new again.
- **Mark as read (criterion 3).** "Mark all as read" on the index, "Mark as read" on each category (it covers every forum inside) and on each forum's page.
- **New for you.** Board 5.1's side card lists up to five threads with new posts, each with "3 new" and a link to its first new post. With nothing new it says "You’re up to date."
- **How it works.** It follows the phpBB pattern the story names: one "everything read" mark per person, one per forum and one per thread. A post is new when someone else wrote it, the reader can read it, it came after the latest of their marks (or after the account was made, so a new account doesn't start with the whole board unread), and it is after the last post they saw in that thread.
- **Privacy.** What someone has read is theirs alone: no one else sees it, staff included. It is in Download my data and is deleted with the account (`docs/retention.md`). Visitors get no dots and no buttons.
- **Docs:** `docs/code-tour.md`, the forums README, `docs/retention.md` and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/224-forum-read-marks.test.sql` (25 tests) covers new threads and replies, one's own posts, the index for the forum and its category, "New for you" with its count and visitors. It also covers the first new post moving forward and never back, "Mark as read" on a category, "Mark all as read", the refusals, and both policies (allowed and denied). Test 021 knows the two new tables; 210 and 211 check they are in Download my data and the deletion rules.
- Unit: `forumReads.test.ts` (what is sent, and reading "New for you").
- `e2e/forum-read-marks.spec.ts`: a new thread on the list, the index and New for you; opening lands on #1, then #2 after two replies; Mark as read on a forum; Mark all as read; a visitor; axe on the index and a forum with new posts at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check. The forum, thread and quote specs still pass.

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- The "No new posts" ring uses the control border colour (#8E7B99) instead of #CBBBD3, so it keeps 3:1 against the card.
- "New for you" says only "You’re up to date." The board adds "New replies in threads you follow show up here", but following threads isn't in a story yet, so it lists every thread with new posts.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **A new account starts with nothing new.** Everything written before the account was made counts as read, as on phpBB; otherwise a new member would see the whole board as new.
- **Reading counts what is on screen:** opening a thread marks everything shown as read, as most forums do. Say if you would rather it marked only what was scrolled past.
- **"New for you" shows five threads** (a proposal).

## Follow-ups
- "Jump to first new post" inside a thread (board 5.2) could follow when threads get long; the list already opens at the first new post.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
