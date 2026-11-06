/**
 * Staff notes on an account: read one page of them and add one (bundle LOGS-1, part a; Robert,
 * 6 Nov 2026: "a place for them to leave comments" on every profile).
 *
 * Who calls it: hooks/useAccountNotes.ts.
 * What it calls next: admin_account_notes() and admin_add_account_note()
 * (supabase/migrations/20270201100001_logs1_01_account_staff_notes.sql). Both check the caller's
 * role and staff session themselves (staff with the Users area: owner, admin, moderator,
 * support); adding a note also writes the audit log, without the note's words.
 * Notes are never edited or deleted, so there is nothing else to call.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** How many notes one page holds. */
export const accountNotesPageSize = 20;

/** The longest note the database accepts (account_staff_notes_body_length). */
export const accountNoteMaximumLength = 2000;

/** One note as the account page shows it. */
export interface AccountNote {
  id: string;
  body: string;
  /** The author's username, or null when they have none yet. */
  authorHandle: string | null;
  /** The first 8 characters of the author's user ID (staff screens never show a full one). */
  authorUserIdShort: string;
  createdAt: string;
}

/** One page of notes, with how many the account has in all. */
export interface AccountNotesPage {
  notes: AccountNote[];
  totalCount: number;
}

/** Why a call failed, in words the page can explain. */
export type AccountNotesFailure =
  'not_allowed' | 'empty_or_long' | 'no_such_account' | 'unreachable';

/** The error a refused call throws. */
export class AccountNotesError extends Error {
  constructor(public readonly failure: AccountNotesFailure) {
    super(`Account notes call failed: ${failure}`);
  }
}

/**
 * Turns Postgres's error code into a reason.
 *
 * @param code - the code, for example "42501"
 * @returns not_allowed (42501), empty_or_long (23514), no_such_account (P0002) or unreachable
 */
function failureFromCode(code: string | undefined): AccountNotesFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'empty_or_long';
  if (code === 'P0002') return 'no_such_account';
  return 'unreachable';
}

/**
 * Reads one page of an account's notes, newest first.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @param pageNumber - from 1
 * @returns the page and the total count (0 when there are none)
 * Errors: throws AccountNotesError with the reason.
 */
export async function fetchAccountNotes(
  client: AppSupabaseClient,
  userId: string,
  pageNumber: number,
): Promise<AccountNotesPage> {
  // Step 1: ask the database for the page.
  const { data, error } = await client.rpc('admin_account_notes', {
    target_user_id: userId,
    page_number: pageNumber,
    page_size: accountNotesPageSize,
  });
  if (error !== null) throw new AccountNotesError(failureFromCode(error.code));
  // Step 2: put each row in the screen's words. Every row carries the same total.
  const rows = data ?? [];
  return {
    notes: rows.map((row) => ({
      id: row.id,
      body: row.body,
      authorHandle: row.author_handle,
      authorUserIdShort: row.author_user_id_short,
      createdAt: row.created_at,
    })),
    totalCount: Number(rows.at(0)?.total_count ?? 0),
  };
}

/**
 * Adds a note to an account.
 *
 * @param client - the shared Supabase client
 * @param userId - the account
 * @param body - the note; the database trims it and refuses an empty or too long one
 * @returns the new note's ID
 * Errors: throws AccountNotesError with the reason.
 */
export async function addAccountNote(
  client: AppSupabaseClient,
  userId: string,
  body: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_add_account_note', {
    target_user_id: userId,
    body,
  });
  if (error !== null) throw new AccountNotesError(failureFromCode(error.code));
  return data;
}
