/**
 * useMyCountry: saving the country the signed-in person lives in (bundle MARKETS-1).
 *
 * Who calls it: CountryChangeForm (Settings › Account and CountryQuestionNotice).
 * What it calls: api/myCountry.ts → set_my_country(). After a save it reads the person's names
 * (which hold the country) and their parental consent again, because the new country's rule can
 * ask for a parent's yes (ParentConsentNotice then shows).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';
import { myParentConsentQueryKey } from '@/features/parent-consent/api/parentConsent';

import { saveMyCountry, type CountryChangeResult } from '../api/myCountry';

import { myNamesKey, requireClient } from './useMyNames';

/** The country and region to save. */
export interface CountryChoice {
  country: string;
  region: string;
}

/**
 * Offers the save.
 *
 * @returns the mutation: mutate({country, region}); data is the result once saved
 */
export function useMyCountry() {
  const { userId } = useSession();
  const queryClient = useQueryClient();
  return useMutation<CountryChangeResult, Error, CountryChoice>({
    mutationFn: async ({ country, region }) =>
      saveMyCountry(await requireClient(), country, region),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: myNamesKey(userId) });
      await queryClient.invalidateQueries({ queryKey: myParentConsentQueryKey(userId) });
    },
  });
}
