<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_


Closes #76

Bundle 9 FORUMS-1, part f: forum search (S1-E8-10). This is the bundle's last part, so the full end-to-end run is in the check table.

## What changed
- **Search on the forum index (criterion 1).** Board 5.1's "Search forum threads and posts" field opens a results page at `/forums/search`. It lists threads (when their title matches) and posts (when their words do), thread titles first, then the closest matches, 20 at a time. Each result shows a "Thread" or "Post #n" pill, the thread's title, the forum, the author, the date and the start of the post. It opens the thread at that post.
- **Romanian-aware matching.** Search reuses the story search's helpers. Diacritics don't matter ("povesti" finds "Poveștile"), Romanian and English stemming apply ("povestea" finds "Poveștile"), and part of a word still finds the post.
- **Filters.** A forum (a category or forum includes everything inside it) and an author's username, with or without "@". Both stay in the address, so the back button and a shared link work.
- **Never found (criterion 2):**
  - deleted, hidden and removed posts;
  - threads or forums the reader can't open;
  - posts by anyone who blocks the reader or whom the reader blocks.
  These use the same checks as the thread page, so search never shows what a thread wouldn't.
- **No forum can be called "search"**, because that address is the search page (a database constraint; no forum has it today).
- **Docs:** `docs/code-tour.md`, the forums README and `docs/board-fixes.md`.

## How it was tested
- `supabase/tests/database/226-forum-search.test.sql` (16 tests) covers:
  - threads and posts, with title matches first;
  - no diacritics, Romanian stemming and part of a word;
  - the forum and author filters;
  - blocked, deleted, removed and hidden content;
  - a one-letter term, visitors, and that no user ID is ever returned.
- Unit: `forumSearch.test.ts` and `forumSearchAddress.test.ts`.
- `e2e/forum-search.spec.ts` covers:
  - search from the index, with the order and a result opening at its post;
  - no diacritics, the forum and author filters, a blocking author's post, and nothing found;
  - axe on the results page at 390, 768 and 1440 px, light and night, ro and en, with the doodle overlap check.

## Local check run
LOCALRUN

## By hand
- Nothing.

## Board mismatches
- The boards don't draw a forum results page (5.1's form points at the story Search board). Forum search has its own page: the same field with Forum and Author filters, then one list of threads and posts.

## Questions for Robert (OPEN or not in the story, built as proposals)
- **"Filterable by space":** spaces arrive in bundle FORUMS-2 (S1-E8-06), which adds that filter. For now the filter is by forum.
- **Order:** thread titles that match first, then the closest matches, then newest. Say if you would rather have newest first.

## Follow-ups
- A stored search column with an index once the forums hold thousands of posts. This is the same follow-up as story search.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
