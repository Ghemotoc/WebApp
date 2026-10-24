# Reading

The reader's side: the story page and (later in the lane) the chapter reader and the teaser. Started by S1-E3-05.

- `components/StoryPage.tsx`: `/s/:storySlug` (board 3.4): `StoryHeader` (cover, pills, title, writer, blurb, tags) and `StorySideColumn` (the writer card, "Labels from the writer", "Report this story"). The rating, label and AI pills, the content note (under the blurb) and the Rating, Labels and AI rows are S1-E3-06. The chapter list comes with S1-E3-03, the reader with S1-E4-01a.
- `components/StoryLabelPills.tsx` (S1-E3-06): the pills a story's labels add (13+/16+/18+, Fan fiction, Parody, the AI answer, "AI-written, not disclosed"); the writer's preview and card use it too.
- `components/StoryChapterList.tsx` (S1-E3-03): "Chapters" on the story page; plain rows until the reader exists.
- `components/ChapterText.tsx` (S1-E3-03): a chapter's Markdown as reading text (no raw HTML, the allowed elements only, safe links with `rel="nofollow ugc noopener"`); the editor's preview uses it now, the reader next.
- `hooks/useStoryPage.ts`: the page, cached per address and per person.
- `api/storyPage.ts`: `get_story_page()`, the only way readers reach a story (ADR 0004): nothing for an unpublished, deleted or moderated-away story, or one rated above the reader's age (`rating_allows()`, S1-E3-06); never the user ID.
- The report link is a stub (an email to the support address) until Lane C's `<ReportButton>` lands (S1-E10-01).
- The database side: `supabase/README.md`, "Stories".
