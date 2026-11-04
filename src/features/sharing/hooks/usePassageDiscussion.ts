/**
 * usePassageDiscussion: whether "Discuss in the forums" may be offered for a chapter's passages
 * (bundle 14d IDEAS-3, part f; idea IDEA-20261102-10).
 *
 * Asked once per chapter for a signed-in reader; a visitor and a chapter still loading get false,
 * so the button never shows before the database says yes (criterion 2).
 * Who calls it: QuoteShareBar. What it calls: api/sharing.ts → passage_discussion_allowed().
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';
import { useSession } from '@/features/auth/hooks/useSession';

import { fetchPassageDiscussionAllowed, type ChapterAddress } from '../api/sharing';

/**
 * Reads the answer.
 *
 * @param address - the chapter
 * @returns true when the reader may take a passage to the forums
 */
export function usePassageDiscussion(address: ChapterAddress): boolean {
  const { userId, isKnown } = useSession();
  const query = useQuery({
    queryKey: ['passage-discussion', address.storySlug, address.chapterCode, userId],
    enabled: isKnown && userId !== null,
    queryFn: async () => fetchPassageDiscussionAllowed(await requireClient(), address),
  });
  return query.data === true;
}
