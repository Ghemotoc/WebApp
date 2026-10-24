# Writing

The writer's side: creating a story, its cover, and (later in the lane) chapters, publishing and managing them. Started by S1-E3-01.

- `components/YourWritingPage.tsx`: `/write` (board 4.1, "Story by story"): the writer's own stories as `WriterStoryCard`s, with "+ New story". The statistics tiles are S1-E3-07.
- `components/NewStoryPage.tsx`: `/write/new` (board 4.2): the form sections `StoryBasicsSection` (title, blurb, language), `CategoryTagsSection` (category chips, `TagInput`), `CoverSection` (`DrawnCoverPicker`, `CoverColourSwatches`, the automatic-cover box) and the action bar, with `StoryPreviewAside` beside them. `FormSection` is the card each section sits in.
- `components/WriteLink.tsx`: the top bar's "Write" button.
- `hooks/useNewStoryForm.ts` (answers, zod checks, `create_story()`), `useStoryFormOptions.ts` (open languages and categories), `useMyStories.ts` (the writer's own list).
- `api/stories.ts`: `open_story_languages()`, `categories`, `create_story()`, `stories` with tags.
- `lib/tags.ts`: the tag rule the form applies as the writer types, the same as the database's `normalise_tag()`.
- Covers are drawn by `src/components/covers/` (`DrawnCover`, `coverDesigns.ts`, `automaticCover.ts` for a skipped cover, S1-E3-13), shared with every screen that shows a cover. The form makes the story's ID so the automatic design is known before the story exists.
- The database side: `supabase/README.md`, "Stories".
