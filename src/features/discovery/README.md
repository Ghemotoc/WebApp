# Discovery

Discover and the story lists. Built by PEOPLE-2: S1-E5-01 (Discover, category and tag pages), S1-E5-09 (See all pages) and S1-E5-02 (sort and filters). PEOPLE-3 added S1-E5-03 (Popular and New and rising, popular as the default sort).

- `components/DiscoverPage.tsx`: screen 3.1 at `/discover`: the header, `CategoryLinks` and one `DiscoverShelf` per list, in the order of the public setting `discover_shelves` (by default: following when signed in, popular, new and rising, new, completed, recently updated, public-domain classics (S1-E5-06), then each category), and "How ranking works" (the terms, section 5). Board: `design/boards/Discover.dc.html`.
- `components/StoryListPage.tsx`: screen 3.10 See all, one page for `/discover/all/:listKind`, `/discover/c/:categorySlug`, `/discover/t/:tag` and `/u/:handle/stories`, with `StoryListHeader`, `StoryListFilters` and `StoryGrid`.
- `components/ListedStoryCard.tsx`: the shared `StoryCard` with the writer, chapter count and status.
- `hooks/useStoryShelf.ts` (21 rows for a shelf), `hooks/useStoryList.ts` (24 a page with "Load more"), `hooks/useListTitle.ts` (eyebrow and title per list).
- `api/storyLists.ts`: the one call, `browse_stories()`.
- `lib/listAddresses.ts`: every list's address, the list behind an address and each list's own sort (`listDefaultSort()`, the same rule as the database's `list_default_sort()`); `lib/sortMemory.ts`: the sort kept for this tab; `lib/categoryAccents.ts`: each category's colour.
- `registerDiscoveryTranslations.ts`: the `discovery` text namespace, added when a discovery component first renders.
- The database side: `supabase/migrations/…_s1_e5_01_browse_stories.sql` `…_s1_e5_02_sort_options.sql` and `…_s1_e5_03_popularity_ranking.sql` (the hourly `compute_story_scores()` job and `story_scores`); tests `151`, `152` and `155`.
- `components/GreetingLine.tsx` and `lib/greeting.ts` (S1-E2-13, with S1-E2-12): the greeting at the top of Discover for someone signed in: good morning, afternoon or evening, or their birthday, birthday month or joining anniversary.
- "Most shared this week" (IDEAS-1 part e): the list `shared` and its own sort `shared`, by the last 7 days' chapter shares (`story_shares_this_week()`); `sortChoicesFor('shared')` puts that order first. The database side: `supabase/migrations/…_ideas1_e_paragraph_links_most_shared.sql`; tests `219` and `e2e/paragraph-links-most-shared.spec.ts`.
