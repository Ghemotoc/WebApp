/**
 * useSponsorPicture: a signed address for a sponsor's checked picture (bundle SPONSORS, part b3;
 * story S1-E12-02).
 *
 * The `sponsor-creatives` bucket is private; Storage gives a visitor a signed address only for a
 * picture that passed the check (policy sponsor_creatives_select_visible, part b1).
 * Who calls it: SponsorAdCreative. What it calls next: Supabase Storage's createSignedUrl().
 */
import { useQuery } from '@tanstack/react-query';

import { getSupabaseClient } from '@/lib/supabase';

/** An hour, the same as other signed picture addresses; the query refreshes it before then. */
const signedSeconds = 60 * 60;

/**
 * Reads the picture's address once per file.
 *
 * @param bucket - the bucket from page_ads(), or null for an ad without a picture
 * @param path - the file's path, or null
 * @returns the query; data is the address, or null when there is none or Storage refuses
 */
export function useSponsorPicture(bucket: string | null, path: string | null) {
  return useQuery({
    queryKey: ['sponsor-picture', bucket, path],
    enabled: bucket !== null && path !== null,
    staleTime: (signedSeconds - 5 * 60) * 1000,
    retry: 1,
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null || bucket === null || path === null) return null;
      const { data, error } = await client.storage
        .from(bucket)
        .createSignedUrl(path, signedSeconds);
      // A refused picture is left out; the ad's words and link still show.
      return error === null ? data.signedUrl : null;
    },
  });
}
