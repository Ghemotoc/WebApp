# READ-2 plan: likes, comments and reactions (S1-E6-03, S1-E6-01, S1-E6-02)

Written 24 Oct 2026 by the builder, from main at 7927660. Not waiting for approval (builder brief).
The detailed design is `plan-s1-e6.md` (Lane A's epic plan); this file records what changed since,
and the answers the builder took for its open questions.

## Order and branch
- One branch `claude/read-2-likes-comments-reactions`, one PR, three story commits: 03, then 01, then 02.
- Issues: #58 (S1-E6-03), #56 (S1-E6-01), #57 (S1-E6-02). No comments on any of them.

## What changed since plan-s1-e6.md
- Lane C's report button, moderation and blocks are all on main now, so the cross-lane questions (0.1 to 0.3)
  are gone: comments get their `when 'comment'` branches in `reportable_item_owner()` and
  `reportable_item_summary()` in their own migration, and blocks are real (`is_blocked_with()`).
- Numbers: migrations `20261026150001` (likes), `20261026160001` (the `comment` reportable value, alone,
  because a new enum value can't be used in the transaction that adds it), `20261026160002` (comments),
  `20261026170001` (reactions); pgTAP `148-chapter-likes`, `149-comments`, `150-comment-reactions`.
- "Report chapter" was still a placeholder in ChapterEnd: READ-2 wires the shared `<ReportButton>` there
  too, so `get_chapter()` returns the chapter's row ID (not personal data; the user ID stays out).

## Answers taken (Decisions taken in the PR)
1. Likes go through the account gate (`is_active_member()`), like every other write.
2. A writer may like their own chapter; the count shows it. The popularity job (S1-E5-03) reads
   `chapter_like_totals` and may leave self-likes out.
3. Comments: newest first, pages of 20 top-level comments with "Show more"; replies one level deep,
   oldest first under their comment.
4. Comment text: the Markdown subset for inline text only (bold, italic, links, line breaks), checked on
   the server like chapter text and drawn with the same safe renderer (links `nofollow ugc noopener`).
5. No editing a comment in March: delete it and post again (editing needs revisions for moderators).
6. A deleted or removed comment that still has replies shows as a marker; otherwise it disappears.
7. Comments switched off on a story: the section says so and shows no comments; nothing is deleted.
8. The limit: 5 an hour in an account's first 24 hours, then 60 an hour (settings), with the wait in minutes.
9. A `comment_posted` job (IDs only) is queued for S1-E7-01 notifications.
10. Reactions are not reportable (no text); abuse is reported on the comment or the account.

## Not in READ-2
- S1-E6-04 downvote (READ-3), S1-E6-06 paragraph markers (after March), notifications (S1-E7-01).
