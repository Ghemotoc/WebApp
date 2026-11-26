/**
 * A profile's activity and public bookshelves as React hooks (bundle 3 of "Build: the full design
 * as user stories", boards C04 and C06).
 *
 * Who calls it: ProfileStats (the Following number), ProfileRecentPosts, ProfileAlsoOn and
 * ProfileBookshelvesPage; the profile's parts share one read through the query cache.
 * What it calls: api/profileActivity.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchProfileActivity, fetchProfileBookshelves } from '../api/profileActivity';
import { usePeopleTranslation } from '../registerPeopleTranslations';

/** The query key every profile activity read starts with. */
export const profileActivityQueryKey = 'profile-activity';

/**
 * A profile's activity, with forum names in the reader's language.
 *
 * @param handle - the profile's username
 * @returns the query: data is the activity, or null when the profile isn't shown to this reader
 */
export function useProfileActivity(handle: string) {
  const { i18n } = usePeopleTranslation();
  // The forum names come in the reader's language (forum_name_in() falls back when a forum has no
  // name in it), so the language is part of the key. "en-GB" asks for "en".
  const language = i18n.language.split('-')[0] ?? 'en';
  return useQuery({
    queryKey: [profileActivityQueryKey, handle, language],
    queryFn: async () => fetchProfileActivity(await requireClient(), handle, language),
  });
}

/**
 * A person's public bookshelves.
 *
 * @param handle - the profile's username
 * @returns the query: data is the bookshelves, or null when the profile isn't shown to this reader
 */
export function useProfileBookshelves(handle: string) {
  return useQuery({
    queryKey: [profileActivityQueryKey, 'bookshelves', handle],
    queryFn: async () => fetchProfileBookshelves(await requireClient(), handle),
  });
}
