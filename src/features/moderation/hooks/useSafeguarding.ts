/**
 * useSafeguarding: a safeguarding case's support contacts, evidence pack and referrals, and
 * moving any case into the safeguarding lane (story S1-E10-10; DSA art. 18).
 *
 * Who calls it: SafeguardingPanel and MoveToSafeguarding (case page).
 * What it calls: api/safeguarding.ts. Only staff with the safeguarding permission see these
 * cases at all; the database refuses everyone else.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  buildEvidencePack,
  fetchSupportContacts,
  listReferrals,
  logReferral,
  markSafeguarding,
  type NewReferral,
} from '../api/safeguarding';

import { moderationFailureOf } from './useModerationQueue';

/**
 * Follows one safeguarding case.
 *
 * @param caseId - the case
 * @param isSafeguarding - false for any other case, so nothing is read
 * @returns the contacts, the referrals, buildPack() and refer() with their states
 */
export function useSafeguarding(caseId: string, isSafeguarding: boolean) {
  const queryClient = useQueryClient();
  const contacts = useQuery({
    queryKey: ['moderation', 'support-contacts', caseId],
    enabled: isSafeguarding,
    retry: false,
    queryFn: async () => fetchSupportContacts(await requireClient(), caseId),
  });
  const referrals = useQuery({
    queryKey: ['moderation', 'referrals', caseId],
    enabled: isSafeguarding,
    retry: false,
    queryFn: async () => listReferrals(await requireClient(), caseId),
  });
  const pack = useMutation({
    mutationFn: async (reason: string) => buildEvidencePack(await requireClient(), caseId, reason),
  });
  const refer = useMutation({
    mutationFn: async (referral: NewReferral) =>
      logReferral(await requireClient(), caseId, referral),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['moderation', 'referrals', caseId] }),
  });
  return {
    contacts: contacts.data ?? null,
    contactsFailure: moderationFailureOf(contacts.isError, contacts.error),
    referrals: referrals.data ?? [],
    buildPack: (reason: string) => pack.mutateAsync(reason),
    isBuilding: pack.isPending,
    packFailure: moderationFailureOf(pack.isError, pack.error),
    refer: (referral: NewReferral) => refer.mutateAsync(referral),
    isReferring: refer.isPending,
    referFailure: moderationFailureOf(refer.isError, refer.error),
  };
}

/**
 * Moves a case into the safeguarding lane.
 *
 * @param caseId - the case
 * @returns move(), its state and failure
 */
export function useMoveToSafeguarding(caseId: string) {
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: async (reason: string) => markSafeguarding(await requireClient(), caseId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['moderation'] }),
  });
  return {
    move: (reason: string) => move.mutateAsync(reason),
    isMoving: move.isPending,
    hasMoved: move.isSuccess,
    moveFailure: moderationFailureOf(move.isError, move.error),
  };
}
