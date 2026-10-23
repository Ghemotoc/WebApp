/**
 * useInviteLinks: the invite links list, making a new link and revoking one (story S1-E11-17).
 *
 * Who calls it: InvitesPage. What it calls: api/inviteLinks.ts. After a make or a revoke the list
 * is read again, so the page always shows what the database holds. The new link stays in memory
 * only until the page is left: the database can't show it again (only its hash is stored).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  InviteError,
  listInviteLinks,
  makeInviteLink,
  revokeInviteLink,
  type InviteFailure,
  type InviteLink,
  type NewInviteRequest,
} from '../api/inviteLinks';

/** The cache key of the list. */
const inviteLinksKey = ['invite-links'];

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param hasFailed - whether it failed
 * @param error - what it threw
 * @returns the reason; unreachable for anything that isn't an InviteError
 */
function failureOf(hasFailed: boolean, error: unknown): InviteFailure | null {
  if (!hasFailed) return null;
  return error instanceof InviteError ? error.failure : 'unreachable';
}

/**
 * Follows the invite links.
 *
 * @returns the list, the make and revoke actions and their states
 */
export function useInviteLinks() {
  const queryClient = useQueryClient();
  const links = useQuery<InviteLink[]>({
    queryKey: inviteLinksKey,
    retry: false,
    queryFn: async () => listInviteLinks(await requireClient()),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: inviteLinksKey });
  const make = useMutation({
    mutationFn: async (request: NewInviteRequest) => makeInviteLink(await requireClient(), request),
    onSuccess: refresh,
  });
  const revoke = useMutation({
    mutationFn: async (change: { inviteId: string; reason: string }) =>
      revokeInviteLink(await requireClient(), change.inviteId, change.reason),
    onSuccess: refresh,
  });

  return {
    links: links.data ?? [],
    isLoading: links.isPending,
    loadFailure: failureOf(links.isError, links.error),
    make: (request: NewInviteRequest) => make.mutateAsync(request),
    isMaking: make.isPending,
    makeFailure: failureOf(make.isError, make.error),
    newInvite: make.data ?? null,
    forgetNewInvite: () => make.reset(),
    revoke: (inviteId: string, reason: string) => revoke.mutateAsync({ inviteId, reason }),
    isRevoking: revoke.isPending,
    revokeFailure: failureOf(revoke.isError, revoke.error),
  };
}
