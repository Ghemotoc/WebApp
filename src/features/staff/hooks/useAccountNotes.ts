/**
 * useAccountNotes: the "Staff notes" section of the account page: one page of notes, paging and
 * the form that adds one (bundle LOGS-1, part a).
 *
 * Who calls it: components/users/AccountNotes.tsx.
 * What it calls: api/accountNotes.ts, which calls admin_account_notes() and
 * admin_add_account_note(). Adding a note goes back to page 1, where the new note is the first.
 * Its keys start with 'staff-account', so the page's other actions read the notes again too.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  accountNotesPageSize,
  addAccountNote,
  AccountNotesError,
  fetchAccountNotes,
  type AccountNotesFailure,
} from '../api/accountNotes';

import { requireStaffClient } from './requireStaffClient';

/**
 * The reason a call failed, or null when it didn't.
 *
 * @param error - what the call threw, or null
 * @returns the reason; unreachable for anything that isn't an AccountNotesError
 */
function failureOf(error: unknown): AccountNotesFailure | null {
  if (error === null || error === undefined) return null;
  return error instanceof AccountNotesError ? error.failure : 'unreachable';
}

/**
 * Follows the notes on one account.
 *
 * @param userId - the account
 * @returns the page of notes, the page number and count, paging, the add action and its state
 */
export function useAccountNotes(userId: string) {
  const queryClient = useQueryClient();
  const [pageNumber, setPageNumber] = useState(1);

  // Step 1: the page on screen.
  const page = useQuery({
    queryKey: ['staff-account', userId, 'notes', pageNumber],
    retry: false,
    queryFn: async () => fetchAccountNotes(await requireStaffClient(), userId, pageNumber),
  });
  const totalCount = page.data?.totalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / accountNotesPageSize));

  // Step 2: adding a note, then showing page 1 again, where it now sits on top.
  const add = useMutation({
    mutationFn: async (body: string) => addAccountNote(await requireStaffClient(), userId, body),
    onSuccess: async () => {
      setPageNumber(1);
      await queryClient.invalidateQueries({ queryKey: ['staff-account', userId, 'notes'] });
    },
  });

  return {
    notes: page.data?.notes ?? [],
    totalCount,
    pageNumber,
    pageCount,
    isLoading: page.isPending,
    readFailure: failureOf(page.error),
    showPage: setPageNumber,
    addNote: (body: string, onAdded: () => void) => add.mutate(body, { onSuccess: onAdded }),
    isAdding: add.isPending,
    addFailure: failureOf(add.error),
  };
}
