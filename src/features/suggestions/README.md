# suggestions

Suggestions from reading (story S1-E15-06, bundle ANALYTICS-1c; research doc "Research: reading
analytics and suggestions").

- `components/StorySuggestions.tsx`: "More by <writer>" and "Stories like this", on the story page
  (below both columns) and after the latest chapter (ChapterEnd, through
  `StorySuggestionsWhenNear.tsx`, which fetches the rows only when the end of the chapter comes
  near, so the chapter reader keeps to its script budget).
- `components/BecauseYouReadShelf.tsx`: "Because you read <title>" on Discover, after the first
  shelf, for a member whose "Suggestions from reading" switch is on.
- `components/SuggestionShelf.tsx`: one row (the shared Shelf and story cards) with "Why am I
  seeing this?", which opens one sentence saying where the row comes from.
- `hooks/useSuggestionRow.ts` and `api/suggestions.ts`: one read per row; a failed read shows no
  row.

In the database (`…_s1_e15_06_suggestions.sql`): `more_by_writer()`, `stories_like_this()` and
`because_you_read()` answer through the same list rules as every shelf (`listed_stories()`).
"Stories like this" comes from `story_pairs`, counted each night by `compute_story_pairs()` from
the Finished shelves of members whose switch is on, kept only when 5 or more finished both: totals,
never who. "Because you read" is worked out when Discover opens and never stored. The switch itself
is in Settings › Privacy (`src/features/privacy/components/ReadingSuggestionsSwitch.tsx`).
