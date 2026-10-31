# READ-4d plan: writer dashboard (S1-E3-07, #26)

Board: design/boards/WriterDashboard.dc.html (4.1). `/write` keeps its "Story by story" list and gains the dashboard above and around it.

## Database (one migration, no new table)
- `shown_count(n)`: n when 0 or 5 and over, null otherwise ("fewer than 5", S1-E3-07 criterion 2).
- `writer_dashboard(period text)` ('all' or 'last_30_days'), security definer, signed-in only, the caller's own stories only. Returns JSON:
  - totals for the period: reads (chapter_reads), read-through (readers whose place is at 95% or more over readers with any place, reading_positions; null below 5 readers), likes, comments (by others, shown to the writer), followers, shares (chapter_shares);
  - followers by week: new followers in each of the last 8 weeks (Monday start, Romanian time);
  - per chapter, all time: reads, read-through, likes, comments, shares, plus status, titles, dates and word count for the drafts and scheduled list;
  - the 3 latest comments on the writer's chapters (display name, handle, chapter, the words, when), through comment_is_shown_to_caller() so blocks and moderation apply.
  - Never a reader's ID or a list of readers (criterion 3).
- Tests 182-writer-dashboard: signed out refused; fewer than 5 is null; 5 shows; read-through; another writer's numbers never appear; no user_id key in the JSON; blocked commenter left out.

## Front end (src/features/writing)
- api/dashboard.ts, hooks/useWriterDashboard.ts, lib/dashboardNumbers.ts (formatting and fewer-than-5).
- components: DashboardTiles (period toggle, five tiles, totals-only notice), FollowersChart (bars with real text), NotPublishedYet, ChapterStatsTable inside WriterStoryCard, LatestComments.
- Locale keys in writing.json (ro and en).

## Tests
- Unit: dashboardNumbers.
- e2e: e2e/writer-dashboard.spec.ts: tiles, fewer than 5, chapter table, axe at 390, 768 and 1440.
