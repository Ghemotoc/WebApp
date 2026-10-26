/**
 * useMyGreeting: today's special greeting for the signed-in person, if any (stories S1-E2-12 and
 * S1-E2-13).
 *
 * Who calls it: the greeting line on Discover (src/features/discovery/components/GreetingLine.tsx).
 * What it calls: api/greeting.ts. useMyBirthday reads it again after a birthday is saved (the
 * ['my-greeting', userId] key). Signed out, it never asks the database.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyGreeting, type MyGreeting } from '../api/greeting';

import { requireClient } from './useMyNames';

/**
 * Follows today's greeting.
 *
 * @returns the greeting, or null while loading, signed out or when it can't be read (the line
 *   then shows the ordinary greeting, so a failure costs nothing)
 */
export function useMyGreeting(): MyGreeting | null {
  const { userId } = useSession();
  const greeting = useQuery<MyGreeting>({
    queryKey: ['my-greeting', userId],
    enabled: userId !== null,
    queryFn: async () => fetchMyGreeting(await requireClient()),
    // The day changes at most once in a long session; an hour is plenty.
    staleTime: 60 * 60 * 1000,
  });
  return greeting.data ?? null;
}
