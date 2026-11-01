# FORUMS-1d plan: read and unread (S1-E8-04, #70)

- Migration `20261128100001_forums1_d_read_and_unread.sql`: tables `forum_read_marks` (board mark with forum_id null, one per forum) and `forum_thread_reads` (last post seen per thread), select_own policies, select grants; functions `forum_and_children()`, `forum_read_since()`, `forum_first_unread_post()`, `forum_unread_post_count()`, `forum_has_unread()`; `forum_thread_summary_json()` gains is_unread and first_unread_post; `forum_index()` gains has_unread (dropped and made again); `forum_new_for_you()`, `mark_forum_thread_read()`, `mark_forums_read()`; data export and deletion rules.
- Tests: 224 (25), 021 lines.
- Screens: UnreadDot on ForumRow and ThreadRow, the list opens unread threads at the first new post, MarkReadButton on the index (all), categories and forum pages, the legend, NewForYou, the thread page marks what is on screen.
- Unit: forumReads.test.ts. e2e: forum-read-marks.spec.ts.
- Docs: code tour, README, retention, board fixes.
