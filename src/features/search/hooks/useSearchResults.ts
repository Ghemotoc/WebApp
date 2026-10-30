/**
 * useSearchResults: the first page of each group of results for the search page (story S1-E5-04).
 *
 * Who calls it: SearchResults. What it calls: useStoryShelf() (browse_stories() with the list
 * 'search') for stories, and api/search.ts for writers and tags. Each group asks for 21, one more
 * than a shelf shows, so the shelf knows to end with "View more" (CLAUDE.md rule 20). Nothing is
 * asked for a term under 2 letters.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';
import { useStoryShelf } from '@/features/discovery/hooks/useStoryShelf';
import { plainList } from '@/features/discovery/lib/listAddresses';

import { fetchFoundTags, fetchFoundWriters } from '../api/search';
import { isSearchable } from '../lib/searchAddresses';

/** One more than a shelf shows. */
const shelfRows = 21;

/**
 * The three groups for one term.
 *
 * @param term - the search term from the address
 * @returns stories (the shelf), writers and tags (each null while loading), whether all arrived
 *   and whether any failed
 */
export function useSearchResults(term: string) {
  const { userId, isKnown } = useSession();
  const canSearch = isKnown && isSearchable(term);
  // Step 1: stories, as the 'search' story list (ratings, blocks and moderation in the database).
  const stories = useStoryShelf(plainList('search', term));
  // Step 2: writers and tags; the key names the reader, because what each person sees differs.
  const writers = useQuery({
    queryKey: ['search', 'writers', term, userId],
    enabled: canSearch,
    queryFn: async () =>
      fetchFoundWriters(await requireClient(), term, { pageSize: shelfRows, offset: 0 }),
  });
  const tags = useQuery({
    queryKey: ['search', 'tags', term, userId],
    enabled: canSearch,
    queryFn: async () =>
      fetchFoundTags(await requireClient(), term, { pageSize: shelfRows, offset: 0 }),
  });
  return {
    stories: stories.shelf,
    writers: writers.data ?? null,
    tags: tags.data ?? null,
    isLoaded: stories.isLoaded && writers.isSuccess && tags.isSuccess,
    loadFailed: stories.loadFailed || writers.isError || tags.isError,
  };
}
