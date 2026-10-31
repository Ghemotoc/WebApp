<!-- claude-projects-attribution: {"github_login":"robertmstanescu"} -->
_Requested by **Robert** · [project thread](https://claude.ai/code/project/chan_013hLd2sr8BttQhmHGA4sgP3?thread=cmsg_013hLd2sr8BttQhmHGA4sgP3VGBxtR4cfzEuGWLxvRAv3A)_

Closes #26

This is part (d) of the READ-4 bundle in Robert's full-app plan: S1-E3-07, the writer dashboard. Board 4.1 WriterDashboard.

## What changed

- **Database** (`20261102130001_s1_e3_07_writer_dashboard.sql`). There is no new table and no new policy.
  - `writer_dashboard(period)` takes `'all'` or `'last_30_days'` and works only for a signed-in writer's own live stories. It returns:
    - the five tiles: reads, read-through, likes, comments and followers (plus shares);
    - new followers for each of the last 8 weeks;
    - one row per chapter, counted over all time;
    - the 3 newest comments from readers.
  - The numbers come from tables that already exist:
    - reads from `chapter_reads`;
    - read-through from `reading_positions`: readers whose place is at 95% or more, divided by readers with any place;
    - likes, comments (only those the writer can see) and follows;
    - shares from `chapter_shares`.
  - The writer's own reads, places and likes never count.
  - **"Fewer than 5" is enforced in SQL (criterion 2).** `shown_count()` turns any count from 1 to 4 into null. `read_through_percent()` returns null below 5 readers. Zero stays 0, because it can't point to anyone.
  - **Totals only (criterion 3).** The JSON never holds a reader's ID or a list of readers. The test checks that no persona ID appears anywhere in the answer. The latest comments are the public words under the chapter, filtered by `comment_is_shown_to_caller()`, so deleted, blocked and moderated comments stay out.
- **Screen** (`/write`, `src/features/writing/`):
  - the header gains "Continue draft";
  - "How readers respond" shows the five tiles, a choice between Last 30 days and All time, and the lilac "These are totals only" note;
  - "Followers over time" is a chart with a text alternative;
  - "Not published yet" lists drafts and scheduled chapters with Edit and Reschedule links;
  - each story card gains a table of numbers per chapter;
  - "Latest on your chapters" shows the newest comments with Reply links.
  - Two doodle-set icons come from `design/assets`: `eye.svg` and `people.svg`.
- **Locales:** a `dashboard` block in `writing.json`, in ro and en.
- **Docs:** code-tour, the writing README, `supabase/README.md` (Stories) and seven new rows in board-fixes:
  - the paragraph-comments line;
  - the "most of them" line;
  - "See all comments", left out until that page exists;
  - the period choice uses ChoiceChips;
  - the chart shows "< 5" above a week with 1 to 4 new followers;
  - Reschedule opens the editor.

## How it was tested

- pgTAP `182-writer-dashboard` (16 tests):
  - a signed-out caller and an unknown period are refused;
  - 12 reads show;
  - the read-through is 3 of 6 readers (the writer's own place is left out) and becomes null below 5 readers;
  - likes from 5 readers show, and the writer's own like is left out;
  - 1 comment comes back as null;
  - the last 30 days leave out older likes, while the chapter table stays all time;
  - a blocked commenter is left out;
  - another writer sees none of these numbers;
  - no user ID appears anywhere.
- Unit: `dashboardNumbers.test.ts` (formatting and bar heights).
- e2e: `writer-dashboard.spec.ts` (7 tests):
  - the tiles and "fewer than 5";
  - the table per chapter;
  - no reader is named anywhere;
  - the period choice, the waiting draft and Continue draft;
  - axe, no sideways scrolling and no doodle touching text at 390, 768 and 1440 px.

## Local check run

| Check | Result |
| --- | --- |
| lint, typecheck, types:check, i18n:check, migrations:check | pass |
| unit tests | 755 passed |
| db reset + test db | 92 files, 1,948 tests, PASS |
| functions build | compiled |
| e2e: writer-dashboard plus the specs for the /write screens (create-story, automatic-covers, story-settings, ratings, chapter-editor, manage-chapters, epic-s1-e3, doodles, screenshots) | 80 passed. The one failure, create-story's doodle-overlap check at 768 px, was fixed by the second commit; create-story and writer-dashboard then passed again (35 passed) |

The full e2e suite runs once before the bundle's last part merges.

## By hand

Nothing on staging: there is no SQL top-up and there are no new secrets. Optional: read the new Romanian lines in the `dashboard` block of `writing.json`.

## Follow-ups

- The read-through uses each reader's latest place, so a reader who finished and then scrolled back up stops counting. A "furthest place" column would make it exact.
- "See all comments" needs a page listing every comment on a writer's chapters.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01LLW6ezeQPVWfDtwgZ6ADrw
