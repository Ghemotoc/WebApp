/**
 * The picture hooks: a story's uploaded cover and the quiet retry of pictures whose check
 * couldn't run (story S1-E10-05; avatars are drawn since ADMIN-2g, src/features/avatars/).
 *
 * Who calls them: StoryCoverArt (cards, the story page, the teaser, Your writing),
 * the upload fields, and AppShell (the retry, once per signed-in visit).
 * What they call: ../api/pictures.ts.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchStoryCoverPicture, retryPendingPictures } from '../api/pictures';

/** Signed addresses last 30 minutes (api/pictures.ts); asking again after 20 keeps them fresh. */
const freshForMilliseconds = 20 * 60 * 1000;

/**
 * Follows a story's uploaded cover.
 *
 * @param storySlug - the story's public address
 * @param isUpload - false for drawn and automatic covers, so nothing is asked
 * @returns the query: data is the view, or null when there is no uploaded cover to show
 */
export function useStoryCoverPicture(storySlug: string, isUpload: boolean) {
  return useQuery({
    queryKey: ['story-cover-picture', storySlug],
    enabled: isUpload,
    retry: false,
    staleTime: freshForMilliseconds,
    // Read again while the page stays open, so the cover never shows an expired address.
    refetchInterval: freshForMilliseconds,
    queryFn: async () => fetchStoryCoverPicture(await requireClient(), storySlug),
  });
}

/**
 * Asks once per signed-in visit for the check of any picture whose services were down, then
 * refreshes the pictures on screen if any were asked about.
 *
 * @param userId - the signed-in person, or null
 */
export function usePendingPictureRetry(userId: string | null): void {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (userId === null) return;
    let isMounted = true;
    // Step 1: the client; a missing database simply means nothing to retry.
    void getSupabaseClient()
      .then(async (client) => (client === null ? 0 : retryPendingPictures(client)))
      .then((count) => {
        // Step 2: only when something was asked about, the pictures on screen are read again.
        if (isMounted && count > 0) {
          void queryClient.invalidateQueries({ queryKey: ['story-cover-picture'] });
        }
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [userId, queryClient]);
}
