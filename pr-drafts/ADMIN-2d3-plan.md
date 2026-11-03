# ADMIN-2d3: comment lengths and the kind-words nudge

Robert, 2 Nov 2026, 22:09 to 22:11 (project thread), asked for now as part 12d3.

- Settings: `comment_max_characters` 2000 → 3000; new public `paragraph_comment_max_characters` 500.
- Table check on comments widened to a 10,000 safety ceiling; the settings are the real limits.
- Trigger `comments_too_long_for_a_paragraph` (runs after `comments_take_parent_paragraph`), hint `paragraph_too_long:<limit>`.
- Table `comment_nudge_words` (language, phrase), readable by anyone signed in, edited by owner/admin through `admin_add_nudge_word()` / `admin_remove_nudge_word()` with audit log. Seeded ro and en drafts.
- Browser: `useCommentLimit` (public settings), `useKindWordsNudge` + `lib/kindWords.ts` (whole words, case and accent folded), `KindWordsNudge` (Edit / Send anyway). Nothing about the nudge is stored or sent (rule 19).
- Staff › Settings: Kind-words nudge section.
- Tests: db 246 (22), 149 and 021 updated; unit kindWords (6); e2e comment-lengths-and-nudge (3).
