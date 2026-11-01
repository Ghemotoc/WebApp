<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #69

Bundle 9 FORUMS-1, part c: quote, multi-quote and quick reply (S1-E8-03).

## What changed
- **Quote (criterion 1).** Under every post a reader may quote there is now "Quote". It takes the reader to the reply box with that post quoted above it: "Lia wrote in #2:", where #2 links back to the post. The posted reply shows the quote the same way.
- **Add to quotes (criterion 2).** A chip under each post adds it to the quotes (a tick and "Added to quotes" when picked, as on board 5.2). The reply box then says "2 posts quoted" with "Remove quotes", and the reply quotes them in thread order, whatever order they were picked in.
- **Quick reply (criterion 3).** The reply card at the bottom of every thread is the quick reply box: type, press "Post reply", and the reply shows in place without leaving the page.
- **Quotes follow the quoted post.** A reply stores which posts it quotes, never a copy of their words. If a quoted post is deleted, removed by the moderation team or hidden from the reader by a block, every quote of it shows a marker instead ("This post was deleted.", "[Removed by the moderation team]", "This post isn’t available."), so removed words never live on inside replies.
- **Who can quote.** Only readers who can reply see the buttons, and only on posts everyone can read (never a hidden, deleted or removed one). The database checks again: a quote must be a live post of the same thread, at most 10 per reply (a proposal, a setting).
- **Docs:** `docs/code-tour.md` and the forums README.

## How it was tested
- `supabase/tests/database/223-forum-quotes.test.sql` (14 tests): one quote, a multi-quote in thread order without repeats, a post of another thread, the limit, a reply without quotes, a deleted, a removed and a blocked quoted post. No new table or policy.
- Unit: `forumWrites.test.ts` (the two new refusals and reading a quote, never keeping words for a marker).
- `e2e/forum-quotes.spec.ts`: Quote focuses the reply box and the reply links back; Add to quotes picks out of order and posts in thread order; Remove quotes; posting without leaving the page; a deleted quoted post; no buttons for a visitor; axe on the thread page with a pick at 390, 768 and 1440 px, light and night, ro and en. `e2e/forum-threads.spec.ts` and `forums.spec.ts` still pass.

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- Board 5.2's "Follow thread" and "Don’t bump the thread" sit next to the reply box; they aren't in this story and stay out (listed in docs/board-fixes.md with part b's list).
- The board shows "Quote" and "Add to quotes" on every post; here they show only to readers who may reply, and not on posts nobody else can read.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **A quote shows the whole quoted post,** as on the board. Long posts could be cut to their first lines with "Read the post"; say if you want that.
- **At most 10 quotes in one reply** (a setting).
- **Quoting one's own post** is allowed, as on most forums.

## Follow-ups
- None.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
