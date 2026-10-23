/**
 * Reads the audit log for the Audit log screen (story S1-E11-01; architecture 1.8.3: owner and
 * admin search and export it).
 *
 * Who calls it: hooks/useAuditLog.ts.
 * What it calls next: admin_search_audit_log() for one page and admin_export_audit_log() for the
 * CSV rows (…_s1_e11_01_admin_shell.sql). Both check the caller's role and staff session
 * themselves; the export also writes its own audit row. Rows carry usernames and an 8-character
 * target ID, never a full user ID (architecture 1.6).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What the person can filter by. All optional. */
export interface AuditLogFilters {
  /** The start of the action name, for example "staff." */
  actionPrefix: string;
  /** The username of the staff member who acted. */
  staffHandle: string;
  /** The full user ID of the account acted on (staff may use IDs, architecture 1.6). */
  targetUserId: string;
  /** Dates as "YYYY-MM-DD", inclusive. */
  fromDate: string;
  toDate: string;
}

/** The empty filter: every row. */
export const emptyFilters: AuditLogFilters = {
  actionPrefix: '',
  staffHandle: '',
  targetUserId: '',
  fromDate: '',
  toDate: '',
};

/** One audit row as the screen shows it. */
export interface AuditLogEntry {
  id: string;
  createdAt: string;
  staffHandle: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  targetHandle: string | null;
  targetUserIdShort: string | null;
  reason: string | null;
  beforeValues: Json | null;
  afterValues: Json | null;
}

/** Why a read failed, in words the page can explain. */
export type AuditLogFailure = 'not_allowed' | 'bad_filter' | 'unreachable';

/** The error a refused read throws. */
export class AuditLogError extends Error {
  constructor(public readonly failure: AuditLogFailure) {
    super(`Audit log read failed: ${failure}`);
  }
}

/** How many rows one page holds. */
export const auditLogPageSize = 50;

/**
 * Turns an empty filter into "no filter" for the database.
 *
 * @param value - the typed value
 * @returns the trimmed value, or undefined when empty
 */
function orUndefined(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

/**
 * The filters in the database function's words.
 *
 * @param filters - the screen's filters
 * @returns the function's named arguments
 */
function argumentsFor(filters: AuditLogFilters) {
  return {
    action_prefix: orUndefined(filters.actionPrefix),
    staff_handle: orUndefined(filters.staffHandle),
    target_user_id: orUndefined(filters.targetUserId),
    from_date: orUndefined(filters.fromDate),
    to_date: orUndefined(filters.toDate),
  };
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), bad_filter (22P02: a user ID or date that isn't one) or unreachable
 */
function failureFromCode(code: string | undefined): AuditLogFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '22P02' || code === '22007' || code === '22008') return 'bad_filter';
  return 'unreachable';
}

/**
 * One database row in the screen's words.
 *
 * @param row - as admin_search_audit_log() returns it
 * @returns the entry
 */
function entryFromRow(row: {
  id: string | null;
  created_at: string | null;
  staff_handle: string | null;
  action: string | null;
  target_type: string | null;
  target_id: string | null;
  target_handle: string | null;
  target_user_id_short: string | null;
  reason: string | null;
  before_values: Json | null;
  after_values: Json | null;
}): AuditLogEntry {
  return {
    id: row.id ?? '',
    createdAt: row.created_at ?? '',
    staffHandle: row.staff_handle,
    action: row.action ?? '',
    targetType: row.target_type ?? '',
    targetId: row.target_id,
    targetHandle: row.target_handle,
    targetUserIdShort: row.target_user_id_short,
    reason: row.reason,
    beforeValues: row.before_values,
    afterValues: row.after_values,
  };
}

/**
 * Reads one page of the audit log.
 *
 * @param client - the shared Supabase client
 * @param filters - what to search for
 * @param pageNumber - from 1
 * @returns the page's entries, newest first
 * Errors: throws AuditLogError('not_allowed') for anyone but owner and admin.
 */
export async function searchAuditLog(
  client: AppSupabaseClient,
  filters: AuditLogFilters,
  pageNumber: number,
): Promise<AuditLogEntry[]> {
  const { data, error } = await client.rpc('admin_search_audit_log', {
    ...argumentsFor(filters),
    page_size: auditLogPageSize,
    page_number: pageNumber,
  });
  if (error !== null) throw new AuditLogError(failureFromCode(error.code));
  return data.map(entryFromRow);
}

/**
 * Reads every row the filters match, for a CSV file. The database logs the export.
 *
 * @param client - the shared Supabase client
 * @param filters - what to export
 * @returns at most 10,000 entries, newest first
 * Errors: throws AuditLogError('not_allowed') for anyone but owner and admin.
 */
export async function exportAuditLog(
  client: AppSupabaseClient,
  filters: AuditLogFilters,
): Promise<AuditLogEntry[]> {
  const { data, error } = await client.rpc('admin_export_audit_log', argumentsFor(filters));
  if (error !== null) throw new AuditLogError(failureFromCode(error.code));
  return data.map(entryFromRow);
}
