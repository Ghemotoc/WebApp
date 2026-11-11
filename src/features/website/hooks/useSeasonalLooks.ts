/**
 * useSeasonalWindows and useSaveSeasonalWindows: the data behind Staff › Website › Seasonal looks
 * (bundle G12a).
 *
 * Who calls them: SeasonalLooksTab.
 * What they call: fetchSeasonalWindows() and saveSeasonalWindows() in api/staff/seasonalLooks.ts.
 * After a save the app's public settings are read again, so this device shows the new weeks too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import type { SeasonalWindow } from '@/lib/looks';

import { fetchSeasonalWindows, saveSeasonalWindows } from '../api/staff/seasonalLooks';

/** The staff page's query key. */
const seasonalWindowsKey = ['staff-seasonal-windows'] as const;

/**
 * The four windows as they are saved now.
 *
 * @returns the query; data is the windows in calendar order
 */
export function useSeasonalWindows() {
  return useQuery({
    queryKey: seasonalWindowsKey,
    retry: false,
    queryFn: async () => fetchSeasonalWindows(await requireClient()),
  });
}

/**
 * Saves a changed set of windows.
 *
 * @returns the mutation; its error is a SeasonalSaveError
 */
export function useSaveSeasonalWindows() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (windows: readonly SeasonalWindow[]) =>
      saveSeasonalWindows(await requireClient(), windows),
    onSuccess: async () => {
      // Step 1: the page reads the saved windows; step 2: the app's own copy of the settings.
      await queryClient.invalidateQueries({ queryKey: seasonalWindowsKey });
      await queryClient.invalidateQueries({ queryKey: ['public-settings'] });
    },
  });
}
