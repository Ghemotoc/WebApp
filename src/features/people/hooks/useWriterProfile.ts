/**
 * useWriterProfile: a writer's public profile (story S1-E5-05).
 *
 * Who calls it: WriterProfilePage. What it calls: api/writerProfile.ts → get_writer_profile().
 * The answer is cached per username and per person (a block or one's own profile changes it).
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { getSupabaseClient } from '@/lib/supabase';

import { fetchWriterProfile, type WriterProfile } from '../api/writerProfile';

/** The cache key's first part, so a block or a follow can refresh every profile at once. */
export const writerProfileQueryKey = 'writer-profile';

/**
 * Loads the profile.
 *
 * @param handle - the username from the address
 * @returns profile (null while loading or when it may not be seen), isLoaded, loadFailed
 */
export function useWriterProfile(handle: string) {
  const { userId, isKnown } = useSession();
  const profile = useQuery<WriterProfile | null>({
    queryKey: [writerProfileQueryKey, handle, userId],
    enabled: isKnown && handle !== '',
    queryFn: async () => {
      const client = await getSupabaseClient();
      if (client === null) throw new Error('The app is not connected to its database.');
      return fetchWriterProfile(client, handle);
    },
  });
  return {
    profile: profile.data ?? null,
    isLoaded: profile.isSuccess,
    loadFailed: profile.isError,
  };
}
