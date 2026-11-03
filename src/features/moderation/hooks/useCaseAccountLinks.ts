/**
 * useCaseAccountLinks: the "Possible returning user" links of one case, and the moderator's link
 * and unlink actions (bundle ADMIN-2, part f2).
 *
 * Who calls it: CaseAccountLinks (case page). What it calls: api/caseAccountLinks.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  changeAccountLink,
  fetchCaseAccountLinks,
  type AccountLinkChange,
} from '../api/caseAccountLinks';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows the links of one case.
 *
 * @param caseId - the case
 * @returns the links, change() and their states
 */
export function useCaseAccountLinks(caseId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['moderation', 'case-account-links', caseId];
  // Step 1: the links (an empty list when there are none).
  const links = useQuery({
    queryKey,
    retry: false,
    queryFn: async () => fetchCaseAccountLinks(await requireClient(), caseId),
  });
  // Step 2: each change reads the links again, so the panel shows what the database kept.
  const change = useMutation({
    mutationFn: async (wanted: AccountLinkChange) =>
      changeAccountLink(await requireClient(), wanted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
  return {
    links: links.data ?? [],
    failure: moderationFailureOf(links.isError, links.error),
    change: (wanted: AccountLinkChange) => change.mutateAsync(wanted),
    isChanging: change.isPending,
    changeFailure: moderationFailureOf(change.isError, change.error),
  };
}
