/**
 * useListPageBackground: the band colour of a genre or tag page, for the visitor's market
 * (bundle G12b).
 *
 * Who calls it: StoryListHeader. What it calls: useVisitorCountry (the account's country, or the
 * connection's) and fetchListPageBackground().
 * Only genre and tag pages have a chosen band; every other list answers null without asking.
 */
import { useQuery } from '@tanstack/react-query';

import type { PillTone } from '@/components/ui/InfoPill';
import { useVisitorCountry } from '@/features/safety/hooks/useVisitorCountry';

import type { ListRequest } from '../api/storyLists';
import { fetchListPageBackground } from '../api/listPageBackground';

/**
 * Follows the chosen band colour.
 *
 * @param request - the list the page shows
 * @returns the colour, or null for the page's default
 */
export function useListPageBackground(request: ListRequest): PillTone | null {
  const { countryCode, isKnown } = useVisitorCountry();
  const listKind = request.kind === 'category' || request.kind === 'tag' ? request.kind : null;
  const listKey = request.key ?? '';
  const background = useQuery({
    queryKey: ['list-page-background', listKind, listKey, countryCode],
    enabled: listKind !== null && listKey !== '' && isKnown,
    staleTime: 10 * 60 * 1000,
    queryFn: async () =>
      listKind === null ? null : fetchListPageBackground(listKind, listKey, countryCode),
  });
  return background.data ?? null;
}
