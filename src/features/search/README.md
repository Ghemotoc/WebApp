# search

Search for stories, writers and tags (story S1-E5-04; board Search 3.2). The search field sits on
the search page; elsewhere the top bar's search pill (from 1024 px) and the tab bar's round Search
button open it (bundle G4 SHELL); results come in three groups, each one line of at most 20 with a
"View more" card to its See all page.

- `lib/searchAddresses.ts`: the addresses (`/search?q=…`, `/search/stories`, `/search/writers`,
  `/search/tags`), the groups and the 2-letter minimum.
- `lib/searchGroups.ts`: how many each group found, for the group chips.
- `api/search.ts`: `search_writers()` and `search_tags()`. Stories come through the story list
  machinery (`browse_stories('search', term)`), so ratings, blocks and moderation are checked in
  one place.
- `hooks/useSearchResults.ts` (the search page) and `hooks/useSearchGroupList.ts` (the writers and
  tags See all pages, 24 a page with Load more).
- `components/`: `SearchForm` (the field), `SearchPage`, `SearchResults`, `SearchGroupShelf`,
  `SearchGroupPage`, `WriterResultCard` and `TagResultCard`. The stories See all page is the
  shared `StoryListPage` at `/search/stories`, sorted by best match.

The database half is `supabase/migrations/…_s1_e5_04_search.sql`.
