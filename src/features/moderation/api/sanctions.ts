/**
 * Applies, lifts and lists sanctions, pauses a reporter and restores a moderated item, for the
 * case page (story S1-E10-06; architecture 1.8.4, screens 8.3 and 8.5).
 *
 * Who calls it: hooks/useSanctions.ts.
 * What it calls next: admin_account_sanctions(), admin_lift_sanction(), admin_pause_reporting()
 * and admin_restore_item() (…_s1_e10_06_sanctions.sql), and the moderated_items table through
 * its staff read policy. Each function checks the caller's role and staff session itself and
 * writes the audit log; this file only passes the answers on.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { ModerationError, type ModerationFailure } from './moderationQueue';

/** The kinds as the database lists them. */
export type SanctionKind = Enums<'sanction_kind'>;

/** One sanction on an account, as staff see it. */
export interface AccountSanction {
  id: string;
  kind: SanctionKind;
  startsAt: string;
  endsAt: string | null;
  liftedAt: string | null;
  note: string;
  appliedByHandle: string | null;
  caseReference: string | null;
  isLive: boolean;
}

/** What staff hid or removed through a case, if anything. */
export interface ModeratedItem {
  id: string;
  state: Enums<'moderated_state'>;
  restoredAt: string | null;
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), refused (23514) or unreachable
 */
function failureFromCode(code: string | undefined): ModerationFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'refused';
  return 'unreachable';
}

/**
 * Lists an account's sanctions, newest first.
 *
 * @param client - the shared Supabase client
 * @param userId - the account (staff may use IDs, architecture 1.6)
 * @returns the sanctions
 * Errors: throws ModerationError('not_allowed') for anyone outside moderation staff.
 */
export async function listAccountSanctions(
  client: AppSupabaseClient,
  userId: string,
): Promise<AccountSanction[]> {
  const { data, error } = await client.rpc('admin_account_sanctions', { target_user_id: userId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    liftedAt: row.lifted_at,
    note: row.note,
    appliedByHandle: row.applied_by_handle,
    caseReference: row.case_reference,
    isLive: row.is_live,
  }));
}

/**
 * Lifts a sanction early.
 *
 * @param client - the shared Supabase client
 * @param sanctionId - which sanction
 * @param reason - why, for the audit log
 * Errors: throws ModerationError with the reason the database gave.
 */
export async function liftSanction(
  client: AppSupabaseClient,
  sanctionId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_lift_sanction', {
    target_sanction_id: sanctionId,
    reason_given: reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Pauses a reporter's reporting for the set period (reporting_pause_days).
 *
 * @param client - the shared Supabase client
 * @param reporterHandle - the reporter's username
 * @param caseId - the case it comes from
 * @param note - why, for the case log
 * Errors: throws ModerationError with the reason the database gave.
 */
export async function pauseReporting(
  client: AppSupabaseClient,
  reporterHandle: string,
  caseId: string,
  note: string,
): Promise<void> {
  const { error } = await client.rpc('admin_pause_reporting', {
    reporter_handle: reporterHandle,
    source_case_id: caseId,
    note_text: note,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * The item a case hid or removed, if any.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the moderated item, or null
 * Errors: throws ModerationError when the read fails.
 */
export async function findModeratedItem(
  client: AppSupabaseClient,
  caseId: string,
): Promise<ModeratedItem | null> {
  const { data, error } = await client
    .from('moderated_items')
    .select('id, state, restored_at')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  const row = data[0];
  return row === undefined ? null : { id: row.id, state: row.state, restoredAt: row.restored_at };
}

/**
 * Brings a hidden or removed item back.
 *
 * @param client - the shared Supabase client
 * @param itemId - the moderated_items row
 * @param reason - why, for the audit log
 * Errors: throws ModerationError with the reason the database gave.
 */
export async function restoreItem(
  client: AppSupabaseClient,
  itemId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_restore_item', {
    target_item_id: itemId,
    reason_given: reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
