/**
 * useCaseEmbed: the music or video card of an embed case (story S1-E3-10).
 *
 * Who calls it: CaseEmbedPanel on the case page. What it calls: api/caseEmbed.ts.
 */
import { useQuery } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import { fetchCaseEmbed } from '../api/caseEmbed';

/**
 * Reads the card once per case.
 *
 * @param caseId - the case's ID
 * @returns the query: data is the card, or null when the case isn't about one
 */
export function useCaseEmbed(caseId: string) {
  return useQuery({
    queryKey: ['moderation', 'case-embed', caseId],
    retry: false,
    queryFn: async () => fetchCaseEmbed(await requireClient(), caseId),
  });
}
