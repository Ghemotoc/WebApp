/**
 * Reads the public form's notices for staff: the notices in one case, the notices whose address
 * points to nothing we host, and the logged on-call alerts; closes an unmatched notice (story
 * S1-E10-02; DSA art. 16; Regulation (EU) 2021/784 art. 15). Also asks a reporter for more
 * details (S1-E10-08), the other way a case reaches the people who reported it.
 *
 * Who calls it: hooks/usePublicNotices.ts. What it calls next: admin_case_notices(),
 * admin_unmatched_notices(), admin_close_unmatched_notice(), admin_on_call_alerts() and
 * admin_request_report_details()
 * (…_s1_e10_02_public_notices.sql). Each checks the caller's role, staff session and, for a
 * child-safety notice, the safeguarding permission; closing writes the audit log.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { ModerationError, type ModerationFailure } from './moderationQueue';

/** One notice in a case, as the case page shows it. */
export interface CaseNotice {
  reference: string;
  kind: 'notice' | 'removal_order';
  reason: Enums<'report_reason'> | null;
  contentUrl: string;
  explanation: string;
  notifierName: string | null;
  notifierEmail: string | null;
  authorityName: string | null;
  orderReference: string | null;
  language: string;
  receivedAt: string;
}

/** A notice whose address matched nothing we host, waiting for a person. */
export interface UnmatchedNotice {
  id: string;
  reference: string;
  kind: 'notice' | 'removal_order';
  reason: Enums<'report_reason'> | null;
  contentUrl: string;
  explanation: string;
  authorityName: string | null;
  receivedAt: string;
  /** An order's one-hour deadline; null for a notice. */
  deadlineAt: string | null;
}

/** One logged on-call alert. */
export interface OnCallAlert {
  id: string;
  caseId: string | null;
  caseReference: string | null;
  noticeReference: string | null;
  createdAt: string;
  /** Who was on call when it came in (S1-E10-09); null when nobody was, and it escalated at once. */
  onCallHandle: string | null;
  acknowledgedAt: string | null;
  escalatedAt: string | null;
}

/**
 * Turns a database error into a reason the screens already know.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), refused (23514: no note; P0002: already closed) or unreachable
 */
function failureFromCode(code: string | undefined): ModerationFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514' || code === 'P0002') return 'refused';
  return 'unreachable';
}

/**
 * Reads the kind the database stores as text.
 *
 * @param kind - 'notice' or 'removal_order'
 * @returns the kind
 */
function kindOf(kind: string): 'notice' | 'removal_order' {
  return kind === 'removal_order' ? 'removal_order' : 'notice';
}

/**
 * Lists the public notices in one case, oldest first.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the notices with the notifier's details (needed for the decision email)
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function listCaseNotices(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseNotice[]> {
  const { data, error } = await client.rpc('admin_case_notices', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    reference: row.reference,
    kind: kindOf(row.kind),
    reason: row.reason,
    contentUrl: row.content_url,
    explanation: row.explanation,
    notifierName: row.notifier_name,
    notifierEmail: row.notifier_email,
    authorityName: row.authority_name,
    orderReference: row.order_reference,
    language: row.language,
    receivedAt: row.received_at,
  }));
}

/**
 * Lists the open notices whose address matched nothing we host, orders first.
 *
 * @param client - the shared Supabase client
 * @returns the notices
 * Errors: throws ModerationError('not_allowed') outside moderation staff.
 */
export async function listUnmatchedNotices(client: AppSupabaseClient): Promise<UnmatchedNotice[]> {
  const { data, error } = await client.rpc('admin_unmatched_notices');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.notice_id,
    reference: row.reference,
    kind: kindOf(row.kind),
    reason: row.reason,
    contentUrl: row.content_url,
    explanation: row.explanation,
    authorityName: row.authority_name,
    receivedAt: row.received_at,
    deadlineAt: row.deadline_at,
  }));
}

/**
 * Closes an unmatched notice after a person checked it, with a note (audited).
 *
 * @param client - the shared Supabase client
 * @param noticeId - the notice
 * @param note - what the moderator found
 * Errors: throws ModerationError: not_allowed, refused (no note, or already closed), unreachable.
 */
export async function closeUnmatchedNotice(
  client: AppSupabaseClient,
  noticeId: string,
  note: string,
): Promise<void> {
  const { error } = await client.rpc('admin_close_unmatched_notice', {
    target_notice_id: noticeId,
    note,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Lists the latest logged on-call alerts, newest first (at most 20).
 *
 * @param client - the shared Supabase client
 * @returns the alerts
 * Errors: throws ModerationError('not_allowed') outside moderation staff.
 */
export async function listOnCallAlerts(client: AppSupabaseClient): Promise<OnCallAlert[]> {
  const { data, error } = await client.rpc('admin_on_call_alerts');
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    id: row.alert_id,
    caseId: row.case_id,
    caseReference: row.case_reference,
    noticeReference: row.notice_reference,
    createdAt: row.created_at,
    onCallHandle: row.on_call_handle,
    acknowledgedAt: row.acknowledged_at,
    escalatedAt: row.escalated_at,
  }));
}

/**
 * Asks the reporter of one report for more details (S1-E10-08; audited by the database).
 *
 * @param client - the shared Supabase client
 * @param reportReference - the report's reference, R-000123
 * @param question - what the moderator asks
 * Errors: throws ModerationError: not_allowed, refused (no question, a decided case or a question
 *   still waiting), unreachable.
 */
export async function requestReportDetails(
  client: AppSupabaseClient,
  reportReference: string,
  question: string,
): Promise<void> {
  const { error } = await client.rpc('admin_request_report_details', {
    report_reference: reportReference,
    question,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
