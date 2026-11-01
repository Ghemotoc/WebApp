# FORUMS-1c plan: quotes, multi-quote and quick reply (S1-E8-03, #69)

- Migration `20261127100001_forums1_c_quotes.sql`: setting `forum_post_max_quotes` (10, proposal); column `forum_posts.quoted_post_ids uuid[]` (IDs, never copied words); `forum_quotes_for_reply()` (same thread, live for the caller, thread order, no repeats, limit); `reply_to_forum_thread(thread_number, body, quoted_posts default '{}')` replacing the two-argument version; `forum_quote_json()`; `forum_post_json()` adds `quotes`.
- No new table or policy (the column sits under forum_posts' existing policies).
- Database test 223 (14): quote, multi-quote order and repeats, other thread, limit, deleted, removed, blocked reader, no-quote reply.
- Screens: `useQuotePicks`, `ForumQuoteBlock`, "Quote" and the "Add to quotes" chip in `PostActions` (Chip gains `accessibleName`), the picked quotes in `ReplyForm`, `lib/forumAddresses.ts`.
- Unit: `forumWrites.test.ts` (quote refusals, `quoteFrom`). e2e: `e2e/forum-quotes.spec.ts` (criteria 1 to 3, deleted quote, visitor, axe).
- Docs: code tour, forums README.
