/**
 * useUnavailableHere: whether a story that didn't open is hidden in the reader's country, so the
 * page can show board B11 instead of "not available" (bundle COUNTRY-1).
 *
 * Who calls it: StoryPage and ChapterReaderPage, only once their own read answered nothing.
 * What it calls: api/unavailableHere.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchUnavailableHere } from '../api/unavailableHere';

/**
 * Asks when it is wanted.
 *
 * @param storySlug - the story's address
 * @param isWanted - true once the page's own read answered nothing
 * @returns isHere (true when hidden in the reader's country) and isSettled (true once there is an
 *   answer, a failure, or nothing to ask); a failed ask counts as "not hidden here"
 */
export function useUnavailableHere(storySlug: string, isWanted: boolean) {
  const answer = useQuery({
    queryKey: ['story-unavailable-here', storySlug],
    enabled: isWanted,
    queryFn: async () => fetchUnavailableHere(await requireClient(), storySlug),
  });
  return {
    isHere: answer.data === true,
    isSettled: !isWanted || answer.isSuccess || answer.isError,
  };
}
