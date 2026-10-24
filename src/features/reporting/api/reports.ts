/**
 * Sends a report to the database (story S1-E10-01; architecture B04).
 *
 * Who calls it: hooks/useReportItem.ts.
 * What it calls next: report_item() (…_s1_e10_01_reports.sql), which finds the item, refuses one's
 * own item, applies the hourly limit, stores the row and returns the reference. The details text
 * is sent and never logged here (CLAUDE.md rule 12). A copied-work report also carries its source
 * and the selected passage (S1-E10-08).
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { ReportReason } from '@/schemas/report';

/** A kind of thing that can be reported, as the database lists them. */
export type ReportableType = Enums<'reportable_type'>;

/** What is sent. */
export interface ReportRequest {
  itemType: ReportableType;
  /** The item as the screen knows it: a username for a profile, a row ID for anything else. */
  itemReference: string;
  reason: ReportReason;
  details: string;
  /**
   * For "Copied from a published work" only (S1-E10-08): the source fields as the database takes
   * them (copySourceForDatabase) and the passage the reader selected.
   */
  copyDetails?: Record<string, string>;
}

/** The confirmation of receipt (DSA art. 16(4)). */
export interface ReportReceipt {
  reference: string;
  receivedAt: string;
}

/** Why a report was refused, in words the dialog can explain. */
export type ReportFailure = 'signed_out' | 'refused' | 'too_many' | 'paused' | 'unreachable';

/** The error a refused report throws. */
export class ReportError extends Error {
  constructor(public readonly failure: ReportFailure) {
    super(`Report failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns signed_out (42501), refused (23514: one's own item, a missing item, details too long),
 *   too_many (54000: the hourly limit), paused (55000: a reporting pause, S1-E10-06) or
 *   unreachable
 */
function failureFromCode(code: string | undefined): ReportFailure {
  if (code === '42501') return 'signed_out';
  if (code === '23514') return 'refused';
  if (code === '54000') return 'too_many';
  if (code === '55000') return 'paused';
  return 'unreachable';
}

/**
 * The copied-work details to send, or nothing: only that reason carries them, and an empty set
 * isn't sent.
 *
 * @param request - the report
 * @returns the details, or undefined
 */
function copyDetailsFor(request: ReportRequest): Record<string, string> | undefined {
  if (request.reason !== 'copied_published_work' || request.copyDetails === undefined)
    return undefined;
  return Object.keys(request.copyDetails).length === 0 ? undefined : request.copyDetails;
}

/**
 * Sends the report.
 *
 * @param client - the shared Supabase client
 * @param request - what is reported and why
 * @returns the reference and the time the database received it
 * Errors: throws ReportError with the reason the database gave.
 */
export async function sendReport(
  client: AppSupabaseClient,
  request: ReportRequest,
): Promise<ReportReceipt> {
  const { data, error } = await client.rpc('report_item', {
    item_type: request.itemType,
    item_reference: request.itemReference,
    reason: request.reason,
    details: request.details.trim() === '' ? undefined : request.details.trim(),
    copy_details: copyDetailsFor(request),
  });
  if (error !== null) throw new ReportError(failureFromCode(error.code));
  const receipt = data[0];
  if (receipt === undefined || receipt.report_reference === null)
    throw new ReportError('unreachable');
  return { reference: receipt.report_reference, receivedAt: receipt.received_at ?? '' };
}
