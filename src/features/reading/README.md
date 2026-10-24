# Reading

The reader's side: the story page and (later in the lane) the chapter reader and the teaser. Started by S1-E3-05.

- `components/StoryPage.tsx`: `/s/:storySlug` (board 3.4): `StoryHeader` (cover, pills, title, writer, blurb, tags) and `StorySideColumn` (the writer card, "Labels from the writer", "Report this story"). The chapter list comes with S1-E3-03, the rating and labels with S1-E3-06, the reader with S1-E4-01a.
- `hooks/useStoryPage.ts`: the page, cached per address and per person.
- `api/storyPage.ts`: `get_story_page()`, the only way readers reach a story (ADR 0004): nothing for an unpublished, deleted or moderated-away story, never the user ID.
- The report link is a stub (an email to the support address) until Lane C's `<ReportButton>` lands (S1-E10-01).
- The database side: `supabase/README.md`, "Stories".
