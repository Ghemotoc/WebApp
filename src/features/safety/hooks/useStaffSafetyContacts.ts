/**
 * useStaffSafetyContacts: every contact and the monthly checks for Staff › Safety contacts, and the
 * actions on them (story S1-E10-13, part b).
 *
 * Who calls it: SafetyContactsAdminPage. What it calls: api/staffSafetyContacts.ts. After any
 * change every 'safety-contacts' query is read again, so the list, the checks, the warnings and
 * the public block all show what the database holds.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { requireClient } from '@/features/account/hooks/useMyNames';

import {
  confirmSafetyContact,
  fetchAllSafetyContacts,
  fetchSafetyContactChecks,
  removeSafetyContact,
  SafetyAdminError,
  saveSafetyContact,
  type SafetyAdminFailure,
  type SafetyContactDraft,
} from '../api/staffSafetyContacts';

/** One change staff can make. */
export type SafetyContactChange =
  | { kind: 'save'; draft: SafetyContactDraft }
  | { kind: 'confirm'; contactId: string }
  | { kind: 'remove'; contactId: string; reason: string };

/**
 * The failure to show, or none.
 *
 * @param hasFailed - whether the query or action failed
 * @param error - what it threw
 * @returns the failure
 */
export function safetyAdminFailureOf(
  hasFailed: boolean,
  error: unknown,
): SafetyAdminFailure | null {
  if (!hasFailed) return null;
  return error instanceof SafetyAdminError ? error.failure : 'unreachable';
}

/**
 * Carries out one change.
 *
 * @param change - what to do
 */
async function applyChange(change: SafetyContactChange): Promise<void> {
  const client = await requireClient();
  if (change.kind === 'save') {
    await saveSafetyContact(client, change.draft);
    return;
  }
  if (change.kind === 'confirm') {
    await confirmSafetyContact(client, change.contactId);
    return;
  }
  await removeSafetyContact(client, change.contactId, change.reason);
}

/**
 * Follows the contacts and the checks.
 *
 * @returns the contacts, the checks, their load state, change() and the change's state
 */
export function useStaffSafetyContacts() {
  const queryClient = useQueryClient();
  const contacts = useQuery({
    queryKey: ['safety-contacts', 'staff', 'all'],
    retry: false,
    queryFn: async () => fetchAllSafetyContacts(await requireClient()),
  });
  const checks = useQuery({
    queryKey: ['safety-contacts', 'staff', 'checks'],
    retry: false,
    queryFn: async () => fetchSafetyContactChecks(await requireClient()),
  });
  const mutation = useMutation({
    mutationFn: applyChange,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['safety-contacts'] }),
  });
  return {
    contacts: contacts.data ?? [],
    checks: checks.data ?? [],
    isLoading: contacts.isPending || checks.isPending,
    loadFailure:
      safetyAdminFailureOf(contacts.isError, contacts.error) ??
      safetyAdminFailureOf(checks.isError, checks.error),
    change: (change: SafetyContactChange) => mutation.mutateAsync(change),
    isChanging: mutation.isPending,
    changeFailure: safetyAdminFailureOf(mutation.isError, mutation.error),
    resetFailure: () => mutation.reset(),
  };
}
