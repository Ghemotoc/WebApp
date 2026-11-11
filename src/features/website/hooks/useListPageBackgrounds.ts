/**
 * useListBackgrounds, useSaveListBackground and useClearListBackground: the data behind Staff ›
 * Website › Genre and tag pages (bundle G12b).
 *
 * Who calls them: ListBackgroundsTab and ListBackgroundEditor.
 * What they call: api/staff/listPageBackgrounds.ts. After a change the staff list and every
 * visitor-side band on this device are read again.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PillTone } from '@/components/ui/InfoPill';
import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  clearListBackground,
  fetchListBackgrounds,
  saveListBackground,
  type BackgroundPlace,
} from '../api/staff/listPageBackgrounds';

/** The staff page's query key. */
const listBackgroundsKey = ['staff-list-backgrounds'] as const;

/**
 * Every saved choice.
 *
 * @returns the query; data is the choices
 */
export function useListBackgrounds() {
  return useQuery({
    queryKey: listBackgroundsKey,
    retry: false,
    queryFn: async () => fetchListBackgrounds(await requireClient()),
  });
}

/**
 * Marks the staff list and the visitor-side bands stale.
 *
 * @returns a function that refreshes both
 */
function useRefreshBackgrounds() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: listBackgroundsKey });
    await queryClient.invalidateQueries({ queryKey: ['list-page-background'] });
  };
}

/**
 * Chooses a page's band colour.
 *
 * @returns the mutation; its error is a BackgroundSaveError
 */
export function useSaveListBackground() {
  const refresh = useRefreshBackgrounds();
  return useMutation({
    mutationFn: async ({ place, palette }: { place: BackgroundPlace; palette: PillTone }) =>
      saveListBackground(await requireClient(), place, palette),
    onSuccess: refresh,
  });
}

/**
 * Takes a page back to its default band.
 *
 * @returns the mutation; its error is a BackgroundSaveError
 */
export function useClearListBackground() {
  const refresh = useRefreshBackgrounds();
  return useMutation({
    mutationFn: async (place: BackgroundPlace) => clearListBackground(await requireClient(), place),
    onSuccess: refresh,
  });
}
