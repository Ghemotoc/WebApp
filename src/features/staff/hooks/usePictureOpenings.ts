/**
 * usePictureOpenings: this week's openings of uploaded pictures by staff, for the staff home page
 * (bundle ADMIN-2, part e2a).
 *
 * Who calls it: PictureOpeningsPanel. What it calls: api/pictureOpenings.ts.
 * Refreshed every minute while the page is open, so a new opening shows without a reload.
 */
import { useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/hooks/useSession';

import { fetchPictureOpenings, type PictureOpening } from '../api/pictureOpenings';

import { requireStaffClient } from './requireStaffClient';

/**
 * Follows the openings.
 *
 * @returns the openings (null when the person isn't alerted or it couldn't be read)
 */
export function usePictureOpenings(): PictureOpening[] | null {
  const { userId } = useSession();
  const openings = useQuery({
    queryKey: ['picture-openings', userId],
    enabled: userId !== null,
    refetchInterval: 60_000,
    retry: false,
    queryFn: async () => fetchPictureOpenings(await requireStaffClient()),
  });
  return openings.data ?? null;
}
