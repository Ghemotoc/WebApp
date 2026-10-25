# Comments

Comments on a chapter, with replies one level deep (S1-E6-01), the reactions on them (S1-E6-02), built by READ-2, and private downvotes (S1-E6-04), built by READ-3.

- `components/CommentsSection.tsx`: "Comments" under the chapter (board 3.5): the heading with the count, the composer (or "Log in to comment"), the list, "Show more comments". The reader fetches this file after the text, through `src/features/reading/components/ChapterComments.tsx`, to keep inside its script budget.
- `components/CommentComposer.tsx`: "Add a comment" and the reply box: up to 2,000 characters, "Hide as a spoiler", the counter, the refusal messages (the limit says how many minutes to wait).
- `components/CommentItem.tsx`: one comment and its replies: initials, name (a link to the profile), the "Writer" pill, the date (`lib/timeAgo.ts`), the words.
- `components/CommentBody.tsx`: the words, the spoiler cover with "Show spoiler", or a marker ("Comment deleted.", "[Removed by the moderation team]").
- `components/CommentText.tsx`: the safe Markdown renderer for comments (paragraphs, bold, italic, links with `rel="nofollow ugc noopener"`; no HTML).
- `components/CommentActions.tsx`: Reply, Delete (asks first) and the shared `ReportButton` (`itemType="comment"`).
- `components/CommentReactions.tsx` and `ReactionIcon.tsx`: the reaction chips (the reader's own with a tick and `aria-pressed`) and "Add a reaction" with the six kinds as SVG icons; `api/reactions.ts`, `hooks/useReactToComment.ts`: `react_to_comment()`.
- `api/comments.ts`, `hooks/useChapterComments.ts`, `hooks/useCommentActions.ts`: `chapter_comments()`, `post_comment()`, `delete_comment()`.
- `registerCommentsTranslations.ts`: the `comments` text namespace, added when the comments first render.
- `components/DownvoteButton.tsx`: the private Downvote chip (only the reader's own vote, never a count); `api/downvotes.ts`, `hooks/useDownvoteComment.ts`: `downvote_comment()`.
- The database side: `supabase/migrations/…_s1_e6_01_comments.sql` `…_s1_e6_02_reactions.sql` and `…_s1_e6_04_downvotes.sql`; tests `149-comments.test.sql`, `150-comment-reactions.test.sql`, `153-comment-downvotes.test.sql`, `e2e/comments.spec.ts`, `e2e/comment-reactions.spec.ts`, `e2e/comment-downvotes.spec.ts`.
