/**
 * useQuoteCardState: whether the reader may make a quote card from this chapter (story S1-E4-07).
 *
 * Asked once per chapter for a signed-in reader. A visitor, a chapter whose writer switched quote
 * cards off (third criterion) or one the reader can't read gets allowed: false, and "Share quote"
 * never appears. alreadyMade shows the limit pop-up instead of a second card (Q17).
 * Who calls it: QuoteShareBar. What it calls: api/sharing.ts → quote_card_state().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchQuoteCardState, type ChapterAddress, type QuoteCardState } from '../api/sharing';

/** The query's first key; making a card refreshes every chapter's answer. */
export const quoteCardStateQueryKey = 'quote-card-state';

/** What a visitor and a chapter still loading get: no quote cards. */
const notAllowed: QuoteCardState = { allowed: false, alreadyMade: false };

/**
 * Reads the state.
 *
 * @param address - the chapter
 * @returns the state (not allowed until the answer arrives)
 */
export function useQuoteCardState(address: ChapterAddress): QuoteCardState {
  const { userId, isKnown } = useSession();
  const query = useQuery({
    queryKey: [quoteCardStateQueryKey, address.storySlug, address.chapterCode, userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchQuoteCardState(await requireClient(), address),
  });
  return query.data ?? notAllowed;
}
