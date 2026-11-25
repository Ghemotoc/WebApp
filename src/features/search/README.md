# search

Search for stories, writers and Together (story S1-E5-04; user stories 1.7 and 1.8, boards
A07-Search and A08-SearchResults). The search field sits on the search page; elsewhere the top
bar's round search button (from 1024 px) and the tab bar's round Search button open it. Before a
search the page shows Recent searches (kept on this device only) and Writers to try. With a term,
the results come in tabs with their counts, Stories, Writers and Together, picked with a segmented
control; the Stories tab has its filters and sort in a column on the left (a sheet under 1024 px)
and one row per story.

- `lib/searchAddresses.ts`: the addresses (`/search?q=…`, `/search/stories`, `/search/writers`,
  `/search/tags`), the groups and the 2-letter minimum.
- `lib/searchFilters.ts`: the results tab (`?in=`) and the Stories tab's filters and sort in the
  address.
- `lib/recentSearches.ts`: the last five searches, in this browser's localStorage only.
- `api/search.ts`: `search_writers()` and `search_tags()`. Stories come through the story list
  machinery (`browse_stories('search', term)`), so ratings, blocks and moderation are checked in
  one place. Together comes from the forums' `search_forum_posts()` (`useForumSearch`).
- `hooks/useSearchGroupList.ts`: writers and tags, 24 a page with Load more (the Writers tab and the
  writers and tags See all pages).
- `components/`: `SearchForm` (the field, a round × to clear, and Search), `SearchPage`,
  `RecentSearches`, `SearchResults` (the tabs), `SearchStoriesTab` with `SearchFilterFields` and
  `StoryResultRow`, `WriterResultRow`, `SearchGroupPage`, `WriterResultCard` and `TagResultCard`.
  The stories See all page is the shared `StoryListPage` at `/search/stories`, sorted by best
  match.

The database half is `supabase/migrations/…_s1_e5_04_search.sql`.
