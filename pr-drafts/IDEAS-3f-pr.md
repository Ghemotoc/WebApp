<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Bundle 14d IDEAS-3, part f of 6: forum help and chapter passages. These are ideas 8 and 10 from the 2 November list, which Robert approved on 2 Nov 2026 at 22:01. The ideas have no story issue. Part e (handing a space to someone else) waits on Robert's answer, so part f comes first.

## What changed

- **"This answered it" in a thread (idea 8).**
  - The person who started a thread sees "This answered it" on each live reply by someone else. Nobody else gets the button, and the server refuses anyone else (criterion 2).
  - The marked reply gets an "Answer" pill. The top of the thread says "Answered: see reply #4 by …", linking straight to it (criterion 1).
  - The forum's list shows "Answered" beside the thread (criterion 1).
  - "Not the answer" on the marked reply takes the mark away. Marking another reply moves it.
  - The opening post and the starter's own replies can't be the answer. An answer that is later deleted or hidden stops counting, so a list never points at words nobody can read.
- **"Discuss in the forums" from a chapter passage (idea 10).**
  - When a reader selects a passage, the selection bar now also offers "Discuss in the forums".
  - It opens the new-thread form in Book talk with the passage quoted and a link back to that passage (criterion 1). The reader adds a title and their own words; nothing is posted until they press "Post the thread".
  - It is offered only to signed-in readers, only on a public story with the writer's passage-sharing switch on (never 16+ or 18+), and never on an unlisted, private, class-only or staff-restricted story (criterion 2).
  - The quote is the same short passage sharing already allows (280 characters, five paragraphs), so the copy limits stay as they are. The link is the clean passage link with no sharer ID.
- **Database changes:**
  - New column `forum_threads.answer_post_id`.
  - New functions `mark_forum_thread_answer()`, `forum_answer_post()` (internal) and `passage_discussion_allowed()`.
  - `forum_thread_summary_json()` gains `is_answered`; `forum_thread_header_json()` gains `answer`; `forum_post_json()` gains `is_answer` and `can_mark_answer`.
  - No new table or policy, and no new user-content type: the thread is an ordinary forum thread, reportable as before.
- `docs/code-tour.md` and the forums README have a section on this part.

## Tests

- `supabase/tests/database/288-forum-help-and-passages.test.sql` (17 tests) covers:
  - marking, the list's "Answered", the link at the top, and who is offered the button;
  - refusing the opening post, the starter's own reply and anyone but the starter;
  - a deleted answer no longer counting, and taking the mark away;
  - passages: allowed on a public chapter, refused for a visitor and for unlisted, staff-restricted, 16+ and class-only stories.
- Vitest: `forumAnswers.test.ts` (refusals in plain words) and `passageThread.test.ts` (the quoted post and its link).
- `e2e/forum-help-and-passages.spec.ts` covers:
  - the starter marking an answer, with the note, the pill and "Answered" in the list;
  - another reader offered no button;
  - a passage starting a Book talk thread with the quote and link, and an unlisted story not offering it;
  - axe on the thread with its answer note at 390, 768 and 1440 px, light and night, ro and en.

## Local check run

Fast checks, run locally on this branch (GitHub Actions is blocked by billing):

- Lint, Prettier, `tsc -b`, `types:check`, `i18n:check` and `migrations:check`: passed.
- Vitest: 234 files, 1,468 tests passed.
- Database (`supabase test db`): 198 files, 4,551 tests passed, including the new `288-forum-help-and-passages` (17 tests).
- Wrangler compile, the build with and without env, and `third-party:check`: passed.
- e2e (forum-help-and-passages, forum-quotes, forum-threads, share-passages, forums): 75 of 75 passed.

## By hand

Nothing.

## Follow-ups

- Idea 10 also names app-only chapters. The app-only switch (S1-E3-08) isn't built yet, so there is nothing to check today. When it lands, `passage_discussion_allowed()` should refuse app-only stories too.
- The idea's note suggests "Answered" in search results as well. The criteria only ask for lists, so search is unchanged.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
