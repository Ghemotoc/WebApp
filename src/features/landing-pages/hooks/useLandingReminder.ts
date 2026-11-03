/**
 * useLandingReminder: asks for, or cancels, the reader's one notification when a landing page's
 * entries open (story S1-E11-14 criterion 8; bundle CONTESTS-13a2b).
 *
 * Who calls it: RemindMeBlock. What it calls: setLandingReminder() in api/landingPages.ts, then
 * reads the page again so the button shows the new state.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { setLandingReminder } from '../api/landingPages';

/**
 * The Remind me action for one page.
 *
 * @param pageSlug - the page's address part after /c/
 * @returns the mutation; call mutate(true) to ask and mutate(false) to cancel
 */
export function useLandingReminder(pageSlug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wanted: boolean) =>
      setLandingReminder(await requireClient(), pageSlug, wanted),
    // Every cached copy of the page (one per signed-in person) is read again.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['landing-page', pageSlug] }),
  });
}
