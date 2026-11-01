/**
 * useCaseMessage: the reported message of a message case and the messages before it (story
 * S1-E9-02).
 *
 * Who calls it: CaseMessagePanel on the case page. What it calls: api/caseMessage.ts. Each read
 * is logged as a sensitive read, so it is read once per visit and never refreshed in the
 * background.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCaseMessages } from '../api/caseMessage';

/**
 * Reads the messages once per case.
 *
 * @param caseId - the case's ID
 * @returns the query: data is the messages, or null when the case isn't about a message
 */
export function useCaseMessage(caseId: string) {
  return useQuery({
    queryKey: ['moderation', 'case-message', caseId],
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    queryFn: async () => fetchCaseMessages(await requireClient(), caseId),
  });
}
