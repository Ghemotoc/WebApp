/**
 * useShareOptions: what the reader may share from this chapter beyond its plain link (story
 * S1-E4-11, third and fourth criteria).
 *
 * Asked once per chapter for a signed-in reader. A visitor, a 16+ or 18+ story, or a chapter
 * whose writer switched a kind off gets false for it, and its button never appears.
 * Who calls it: QuoteShareBar (passage links) and PictureShareButton (picture cards).
 * What it calls: api/sharing.ts → share_options().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchShareOptions, type ChapterAddress, type ShareOptions } from '../api/sharing';

/** What a visitor and a chapter still loading get: nothing beyond the plain link. */
const nothingShared: ShareOptions = { passages: false, pictures: false };

/**
 * Reads the options.
 *
 * @param address - the chapter
 * @returns the options (nothing until the answer arrives)
 */
export function useShareOptions(address: ChapterAddress): ShareOptions {
  const { userId, isKnown } = useSession();
  const query = useQuery({
    queryKey: ['share-options', address.storySlug, address.chapterCode, userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchShareOptions(await requireClient(), address),
  });
  return query.data ?? nothingShared;
}
