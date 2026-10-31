/**
 * The compliance log on the staff Metrics page: authority orders, legal requests and the ANCOM
 * launch notice (story S1-E11-04; board AdminMetrics, screen 8.7).
 *
 * Who calls it: hooks/useComplianceLog.ts.
 * What it calls next: admin_compliance_log(), admin_log_compliance_entry(),
 * admin_complete_compliance_entry() and admin_set_launch_date()
 * (…_s1_e11_04_metrics_and_compliance_log.sql). Each answers only the owner and admins in a staff
 * session and writes the audit log in the same transaction (architecture 1.8.1); an export is
 * logged as a sensitive read.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { listOf, objectOf } from './marchNumbers';

/** What an entry records. */
export type ComplianceEntryKind = Enums<'compliance_entry_kind'>;

/** One row of the log. */
export interface ComplianceEntry {
  /** LR-001 for a logged entry, TCO-0001 for a removal order from the public form. */
  reference: string;
  /** Logged by staff, or a removal order recorded by the public form (S1-E10-09). */
  source: 'log' | 'removal_order';
  kind: ComplianceEntryKind;
  authority: string;
  /** ISO time it arrived. */
  receivedAt: string;
  content: string;
  /** What we did, in staff's words; null for a removal order or an open entry. */
  actionTaken: string | null;
  /** A removal order's moderation action; null for a logged entry or an undecided order. */
  decision: Enums<'moderation_action'> | null;
  /** ISO time it was done, or null while open. */
  completedAt: string | null;
}

/** The ANCOM launch notice (Law 50/2024: within 45 days of launch). */
export interface LaunchTask {
  /** "YYYY-MM-DD", or null until the launch date is set. */
  launchDate: string | null;
  /** "YYYY-MM-DD", or null until the launch date is set. */
  dueOn: string | null;
  /** The first done launch notice in the log, or null. */
  noticeReference: string | null;
  noticeDoneAt: string | null;
}

/** The whole answer. */
export interface ComplianceLog {
  entries: ComplianceEntry[];
  launch: LaunchTask;
}

/** A new entry from the form. */
export interface NewComplianceEntry {
  kind: ComplianceEntryKind;
  authority: string;
  /** ISO time it arrived. */
  receivedAt: string;
  content: string;
  /** What was done, or "" while it is open. */
  actionTaken: string;
  /** ISO time it was done, or null while it is open. */
  completedAt: string | null;
}

/**
 * Why a call failed: not the owner or an admin; a field the database refused (its hint word);
 * or anything else.
 */
export type ComplianceLogFailure =
  | 'not_allowed'
  | 'empty'
  | 'too_long'
  | 'in_future'
  | 'done_before_received'
  | 'action_needs_time'
  | 'already_done'
  | 'unreachable';

/** The error a failed call throws. */
export class ComplianceLogError extends Error {
  constructor(public readonly failure: ComplianceLogFailure) {
    super(`Compliance log call failed: ${failure}`);
  }
}

/** The reason words the database sends as hints. */
const fieldFailures: ComplianceLogFailure[] = [
  'empty',
  'too_long',
  'in_future',
  'done_before_received',
  'action_needs_time',
  'already_done',
];
const knownKinds: ComplianceEntryKind[] = ['authority_order', 'legal_request', 'launch_notice'];
const knownDecisions: Enums<'moderation_action'>[] = [
  'no_action',
  'remove',
  'restrict',
  'warn',
  'suspend',
  'ban',
];

/**
 * Turns a database error into the page's reason.
 *
 * @param error - the error Supabase returned
 * @returns the error to throw
 */
function errorFrom(error: { code?: string; hint?: string }): ComplianceLogError {
  if (error.code === '42501') return new ComplianceLogError('not_allowed');
  const fieldFailure = fieldFailures.find((failure) => failure === error.hint);
  return new ComplianceLogError(fieldFailure ?? 'unreachable');
}

/**
 * A JSON value as text.
 *
 * @param value - from the answer
 * @returns the text, or null for anything else
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * One row in the page's words.
 *
 * @param row - one object of the answer's entries
 * @returns the entry
 */
function entryFrom(row: Record<string, Json | undefined>): ComplianceEntry {
  return {
    reference: textOrNull(row.reference) ?? '',
    source: row.source === 'removal_order' ? 'removal_order' : 'log',
    kind: knownKinds.find((kind) => kind === row.kind) ?? 'legal_request',
    authority: textOrNull(row.authority) ?? '',
    receivedAt: textOrNull(row.received_at) ?? '',
    content: textOrNull(row.content) ?? '',
    actionTaken: textOrNull(row.action_taken),
    decision: knownDecisions.find((decision) => decision === row.decision) ?? null,
    completedAt: textOrNull(row.completed_at),
  };
}

/**
 * The answer in the page's words.
 *
 * @param answer - what admin_compliance_log() returned
 * @returns the log
 */
export function complianceLogFromAnswer(answer: Json): ComplianceLog {
  const fields = objectOf(answer);
  const launch = objectOf(fields.launch);
  return {
    entries: listOf(fields.entries).map(entryFrom),
    launch: {
      launchDate: textOrNull(launch.launch_date),
      dueOn: textOrNull(launch.due_on),
      noticeReference: textOrNull(launch.notice_reference),
      noticeDoneAt: textOrNull(launch.notice_done_at),
    },
  };
}

/**
 * Reads the log.
 *
 * @param client - the shared Supabase client
 * @param forExport - true when the person downloads it (logged as a sensitive read)
 * @returns the log
 * Errors: throws ComplianceLogError.
 */
export async function fetchComplianceLog(
  client: AppSupabaseClient,
  forExport = false,
): Promise<ComplianceLog> {
  const { data, error } = await client.rpc('admin_compliance_log', { for_export: forExport });
  if (error !== null) throw errorFrom(error);
  return complianceLogFromAnswer(data);
}

/**
 * Logs a new entry.
 *
 * @param client - the shared Supabase client
 * @param entry - what the form holds
 * @returns the new entry's reference, for example LR-003
 * Errors: throws ComplianceLogError, with the field reason when the database refused a field.
 */
export async function logComplianceEntry(
  client: AppSupabaseClient,
  entry: NewComplianceEntry,
): Promise<string> {
  const { data, error } = await client.rpc('admin_log_compliance_entry', {
    kind: entry.kind,
    authority: entry.authority,
    received: entry.receivedAt,
    what_was_asked: entry.content,
    // An open entry sends neither, so the database keeps both empty.
    ...(entry.completedAt === null
      ? {}
      : { action: entry.actionTaken, done_at: entry.completedAt }),
  });
  if (error !== null) throw errorFrom(error);
  return data;
}

/**
 * Records what was done about an open entry, now.
 *
 * @param client - the shared Supabase client
 * @param reference - the entry, for example LR-002
 * @param action - what was done
 * @returns the time it was done
 * Errors: throws ComplianceLogError ('already_done' when someone finished it first).
 */
export async function completeComplianceEntry(
  client: AppSupabaseClient,
  reference: string,
  action: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_complete_compliance_entry', {
    entry_reference: reference,
    action,
  });
  if (error !== null) throw errorFrom(error);
  return data;
}

/**
 * Sets the public launch date the ANCOM notice is due from.
 *
 * @param client - the shared Supabase client
 * @param launchDate - "YYYY-MM-DD"
 * Errors: throws ComplianceLogError.
 */
export async function setLaunchDate(client: AppSupabaseClient, launchDate: string): Promise<void> {
  const { error } = await client.rpc('admin_set_launch_date', { new_date: launchDate });
  if (error !== null) throw errorFrom(error);
}
