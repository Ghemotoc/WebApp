# Discovery

Discover and the story lists. Built by PEOPLE-2: S1-E5-01 (Discover, category and tag pages), S1-E5-09 (See all pages) and S1-E5-02 (sort and filters).

- `components/DiscoverPage.tsx`: screen 3.1 at `/discover`: the header, `CategoryLinks` and one `DiscoverShelf` per list (following when signed in, recently updated, new, completed, then each category). Board: `design/boards/Discover.dc.html`.
- `components/StoryListPage.tsx`: screen 3.10 See all, one page for `/discover/all/:listKind`, `/discover/c/:categorySlug`, `/discover/t/:tag` and `/u/:handle/stories`, with `StoryListHeader`, `StoryListFilters` and `StoryGrid`.
- `components/ListedStoryCard.tsx`: the shared `StoryCard` with the writer, chapter count and status.
- `hooks/useStoryShelf.ts` (21 rows for a shelf), `hooks/useStoryList.ts` (24 a page with "Load more"), `hooks/useListTitle.ts` (eyebrow and title per list).
- `api/storyLists.ts`: the one call, `browse_stories()`.
- `lib/listAddresses.ts`: every list's address and the list behind an address; `lib/sortMemory.ts`: the sort kept for this tab; `lib/categoryAccents.ts`: each category's colour.
- `registerDiscoveryTranslations.ts`: the `discovery` text namespace, added when a discovery component first renders.
- The database side: `supabase/migrations/…_s1_e5_01_browse_stories.sql` (and `…_s1_e5_02_sort_options.sql`); tests `151` (and `152`).
