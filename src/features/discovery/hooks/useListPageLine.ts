/**
 * useListPageLine: the short line staff wrote under a genre or tag page's title, in the page's
 * language or else in English (BOOKS-A06 and BOOKS-A09; LOCALISE-1, English is the main language).
 *
 * Who calls it: StoryListHeader. What it calls: fetchListPageLine(), keyed by the interface
 * language, so switching language reads the line again.
 * Only genre and tag pages have a line; every other list answers null without asking.
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { ListRequest } from '../api/storyLists';
import { fetchListPageLine, type ListPageLine } from '../api/listPageLine';

/**
 * Follows the line.
 *
 * @param request - the list the page shows
 * @returns the line and its language, or null when there is none
 */
export function useListPageLine(request: ListRequest): ListPageLine | null {
  const { i18n } = useTranslation();
  const listKind = request.kind === 'category' || request.kind === 'tag' ? request.kind : null;
  const listKey = request.key ?? '';
  const pageLanguage = i18n.resolvedLanguage ?? i18n.language;
  const pageLine = useQuery({
    queryKey: ['list-page-line', listKind, listKey, pageLanguage],
    enabled: listKind !== null && listKey !== '',
    staleTime: 10 * 60 * 1000,
    queryFn: async () =>
      listKind === null ? null : fetchListPageLine(listKind, listKey, pageLanguage),
  });
  return pageLine.data ?? null;
}
