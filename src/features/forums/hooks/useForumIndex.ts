/**
 * useForumIndex: the forum index in the reader's language (bundle FORUMS-1, part a; S1-E8-01).
 *
 * Who calls it: ForumsPage and ForumPage. What it calls: api/forumIndex.ts → forum_index(),
 * which anyone may read, signed out included ("Anyone can read the forums", board 5.1).
 */
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchForumIndex, type ForumEntry } from '../api/forumIndex';

/** The cache key every forum read starts with, so a change can refresh them all. */
export const forumsQueryKey = 'forums';

/**
 * Reads every live category, forum and subforum, named in the interface language.
 *
 * @returns entries (null while loading) and loadFailed
 */
export function useForumIndex() {
  const { i18n } = useTranslation();
  // The names come in the language the reader sees the app in; a new language reads again.
  const language = i18n.language;
  const index = useQuery<ForumEntry[]>({
    queryKey: [forumsQueryKey, 'index', language],
    queryFn: async () => fetchForumIndex(await requireClient(), language),
  });
  return { entries: index.data ?? null, loadFailed: index.isError };
}
