/**
 * useBrandSlots, useBrandUpload and useBrandClear: the four brand slots on Staff › Website ›
 * Branding (bundle BRAND-1, part a).
 *
 * Who calls them: BrandingTab (the slots) and BrandSlotCard (upload and "Use the default").
 * What they call: fetchStaffBrandSlots(), setBrandAsset() and clearBrandAsset() in
 * api/brandAssets.ts, and uploadBrandPicture() in pictures/api/pictures.ts.
 * Why the slots are read again: a new picture waits for its check (and for a moderator only when
 * the check flags it, bundle G12a), so the page reads the slots every 15 seconds while one isn't
 * ready, and stops once all are.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { uploadBrandPicture } from '@/features/pictures/api/pictureUploads';

import {
  clearBrandAsset,
  fetchStaffBrandSlots,
  setBrandAsset,
  type BrandSlot,
} from '../api/brandAssets';

/** How often the slots are read again while a picture isn't ready. */
const recheckMilliseconds = 15 * 1000;

/** The staff page's query key; the app's own brand query is refreshed alongside it. */
const staffSlotsKey = ['brand-slots'] as const;

/**
 * The filled slots with each picture's check state.
 *
 * @returns the query; data is the filled slots by name
 */
export function useBrandSlots() {
  return useQuery({
    queryKey: staffSlotsKey,
    retry: false,
    queryFn: async () => fetchStaffBrandSlots(await requireClient()),
    // Ask again while any picture is still being checked or waits for a moderator.
    refetchInterval: (query) => {
      const slots = Object.values(query.state.data ?? {});
      return slots.some((slot) => slot.view.state !== 'visible' && slot.view.state !== 'removed')
        ? recheckMilliseconds
        : false;
    },
  });
}

/**
 * Refreshes the staff page and the logo the app itself shows.
 *
 * @returns a function that marks both stale
 */
function useRefreshBrand() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: staffSlotsKey });
    await queryClient.invalidateQueries({ queryKey: ['brand-assets'] });
  };
}

/**
 * Uploads a picture for one slot, asks for its check and puts it in the slot.
 *
 * @param slot - the slot
 * @returns the mutation; resolves to the picture's status after the check
 */
export function useBrandUpload(slot: BrandSlot) {
  const refresh = useRefreshBrand();
  return useMutation({
    mutationFn: async (file: File) => {
      // Step 1: the upload, its registration and the check request.
      const client = await requireClient();
      const uploaded = await uploadBrandPicture(client, { slot, file });
      // Step 2: the slot now points at it; the app shows it once the check clears it (G12a).
      await setBrandAsset(client, slot, uploaded.pictureId);
      return uploaded;
    },
    onSuccess: refresh,
  });
}

/**
 * Empties a slot, so the bundled default shows again.
 *
 * @param slot - the slot
 * @returns the mutation
 */
export function useBrandClear(slot: BrandSlot) {
  const refresh = useRefreshBrand();
  return useMutation({
    mutationFn: async () => clearBrandAsset(await requireClient(), slot),
    onSuccess: refresh,
  });
}
