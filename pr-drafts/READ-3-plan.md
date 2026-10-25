# READ-3 plan: private downvotes, notifications and the two epic checks

Stories: S1-E6-04 (#59), S1-E7-01 (#63), S1-E6-QA (#62), S1-E7-QA (#66). Branch `claude/read-3-downvotes-notifications` from main at 0102a17. No issue has comments.

## S1-E6-04 Private downvote

- Migration `…_s1_e6_04_downvotes.sql`: `comment_downvotes` (user_id, comment_id, is_counted, timestamps; one per person and comment). RLS: the voter reads their own row, so the button can show it; staff with moderation view read all (architecture 1.6: "downvotes are readable only by staff"). No count is ever answered to anyone else, the author included.
- `downvote_comment(comment_id, should_downvote)`: readable live comment only, never one's own, the account gate to add (taking it away always works). An account under 24 hours old (`downvote_new_account_hours`, 24, proposal) is stored with `is_counted = false`.
- Threshold: `downvote_case_threshold` setting, 5 distinct counted accounts (proposal). Crossing it opens a case in the queue at the lowest tier (`seven_days`), source `downvotes` (new `case_source` value), reference `D-000001`; if the comment already has an open case nothing new opens. Downvotes never reach ranking.
- `comment_json()` adds `downvoted_by_me` only. The comment's action row gets a "Downvote" toggle (aria-pressed, a hint "Only moderators see downvotes"). Forum posts get theirs with S1-E8 (after March).
- Queue: the source label "Downvotes" in the queue and case page.
- Tests: pgTAP 153 (privacy, own row, staff read, 24-hour rule, threshold opens one case at seven_days, block and gate refusals), e2e.

## S1-E7-01 In-app notifications

- Migration `…_s1_e7_01_notifications.sql`: `notifications` (user_id = the person told, kind, actor_user_id, story_id, chapter_id, comment_id, case_id, group_key, actor_count, is_required, read_at, timestamps). RLS: own rows only. Writes only through internal functions; `mark_notifications_read(notification_ids uuid[] default null)` (null = all).
- Kinds: `new_chapter` (a followed writer or story publishes; one per follower, never for a story the follower's age can't open, never across a block), `comment_on_chapter` (the writer), `comment_reply` (the parent comment's author), `comment_reactions` (grouped per comment within an hour, proposal), `new_follower` (grouped per day), `moderation_decision` (the content's owner, `is_required`: can't be switched off, DSA art. 17).
- Where they come from: `run_notification_jobs()` turns the queued `chapter_published` and `comment_posted` jobs into notifications, every minute by pg_cron (tests call it directly); reactions, follows and decisions notify in the same transaction.
- `my_notifications(before)`: the page, 30 at a time, with handles, display names, titles and addresses, never a user ID; `my_unread_notification_count()`.
- Screen 6.2 at `/notifications` (board Notifications): eyebrow, "What's new", "n new since you last looked", Mark all as read, filter chips (All, Replies, Follows, Stories, Staff) with counts, groups Today, Yesterday, Earlier this week, Older, rows with icon, text, time and one action link, and the "Decisions about your posts" card. The bell in the top bar with an unread badge, refreshed every minute and on focus (Realtime later, decision below).
- Left out: the "Your choices" card and Settings link (S1-E7-02, after March), "Unread only", data download and certificate rows (their stories are after March), mentions (S1-E8).

## Epic checks

- S1-E6-QA: `e2e/epic-s1-e6.spec.ts` walks comment, reaction, like, downvote and follows with adult_writer and teen_17; kid_14_ok can't open a 16+ chapter so can't comment; kid_14_waiting is read-only; blocker and blocked can do none of it. `docs/epic-reports/S1-E6.md`.
- S1-E7-QA: `e2e/epic-s1-e7.spec.ts`: a follow, a comment and a new chapter each notify the right person; nobody is told about someone they blocked; a decision arrives. `docs/epic-reports/S1-E7.md`.

## Decisions to record

- Polling (every 60 s and on focus) instead of Realtime for the badge: one less moving part for March; Realtime can replace it without changing the table.
- Grouping windows: reactions an hour (the story's proposal), new followers a day.
- The decision notification says what was decided and links to the item; the statement of reasons and the appeal link join with S1-E10-04 (SAFE-3).
- Threshold 5 and 24 hours are settings, changed by migration until S1-E11-03.
