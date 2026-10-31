/**
 * useMyAgeCheck: the signed-in person's age check (story S1-E2-08, part 08a).
 *
 * Who calls it: AgeCheckNotice, AgeCheckPage and AgeCheckReturnPage.
 * What it calls: api/ageCheck.ts → my_age_check(). Signed out, it reads nothing.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchMyAgeCheck, myAgeCheckQueryKey, type MyAgeCheck } from '../api/ageCheck';

/**
 * Follows the person's age check.
 *
 * @param pollEveryMs - read again this often while waiting for a result (the return page); 0 to
 *   read once
 * @returns check (null signed out or without a profile, undefined while loading) and loadFailed
 */
export function useMyAgeCheck(pollEveryMs = 0) {
  const { userId } = useSession();
  const check = useQuery<MyAgeCheck | null>({
    queryKey: myAgeCheckQueryKey(userId),
    enabled: userId !== null,
    queryFn: async () => fetchMyAgeCheck(await requireClient()),
    // Poll only while a result is on its way, so the page stops once it arrives.
    refetchInterval: (query) =>
      pollEveryMs > 0 && query.state.data?.isChecking === true ? pollEveryMs : false,
  });
  return { check: userId === null ? null : check.data, loadFailed: check.isError };
}
