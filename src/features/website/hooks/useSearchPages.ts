/**
 * useSearchPages: the data behind Staff › Website › Search and sharing (story S1-E11-39; bundle
 * SEO-1d).
 *
 * Who calls it: SearchSharingTab.
 * What it calls: fetchSearchPages() in api/staff/searchPages.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchSearchPages } from '../api/staff/searchPages';

/**
 * Every public page with what search and share cards show, and its warnings.
 *
 * @returns the query; its error is a SearchPagesError
 */
export function useSearchPages() {
  return useQuery({
    queryKey: ['staff-search-pages'],
    retry: false,
    queryFn: async () => fetchSearchPages(await requireClient()),
  });
}
