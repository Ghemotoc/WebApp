/**
 * Reads the moderation queue and one case, and saves a decision (story S1-E10-03a; architecture
 * 1.8.4, screens 8.2 and 8.3).
 *
 * Who calls it: hooks/useModerationQueue.ts and hooks/useCase.ts.
 * What it calls next: admin_moderation_queue(), admin_case_reports(), admin_case_actions() and
 * admin_decide_case() (…_s1_e10_03a_moderation_queue.sql). Each checks the caller's role, staff
 * session and, for a safeguarding case, the safeguarding permission itself (Q6) and writes the
 * audit log; this file only passes the answers on. Rows carry usernames and age groups, never a
 * user ID or a birth year (architecture 1.8.3).
 */
import type { CompositeTypes, Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The tiers, sources, statuses and actions as the database lists them. */
export type CaseTier = Enums<'case_tier'>;
export type CaseSource = Enums<'case_source'>;
export type CaseStatus = Enums<'case_status'>;
export type ModerationAction = Enums<'moderation_action'>;
export type ReportReason = Enums<'report_reason'>;
export type AgeBand = Enums<'age_band'>;

/** One case as the queue and the case page show it. */
export interface QueueCase {
  id: string;
  reference: string;
  source: CaseSource;
  tier: CaseTier;
  status: CaseStatus;
  itemType: Enums<'reportable_type'>;
  /** A few words saying what was reported (reportable_item_summary()). */
  itemSummary: string;
  reportedHandle: string | null;
  /** The reported account's ID, for its sanctions (staff may see IDs, architecture 1.6). */
  reportedUserId: string;
  reportedAgeBand: AgeBand;
  topReason: ReportReason | null;
  reportCount: number;
  reporterUnder18: boolean;
  isSafeguarding: boolean;
  receivedAt: string;
  deadlineAt: string;
  decision: ModerationAction | null;
  decidedAt: string | null;
  decidedByHandle: string | null;
  /** Who is working on it (S1-E10-03b): their username, when; null when nobody is. */
  claimedByHandle: string | null;
  claimedAt: string | null;
  claimedByMe: boolean;
}

/** One report on a case, for the case page. */
export interface CaseReport {
  reference: string;
  reason: ReportReason;
  details: string | null;
  reporterHandle: string | null;
  reporterAgeBand: AgeBand;
  createdAt: string;
  /** A copied-work report's source, as the reporter gave it (S1-E10-08); null for other reasons. */
  copySource: CopySource | null;
  /** The passage the reporter selected in the story, if any. */
  reportedPassage: string | null;
  /** The latest question to the reporter (S1-E10-08), with its answer once given. */
  detailQuestion: string | null;
  detailAnswer: string | null;
}

/** Where a reporter says the text was copied from; every field is optional (S1-E10-08). */
export interface CopySource {
  title: string | null;
  author: string | null;
  reference: string | null;
  passage: string | null;
}

/** One decision on a case. */
export interface CaseAction {
  action: ModerationAction;
  note: string;
  staffHandle: string | null;
  createdAt: string;
}

/** Who has claimed a case, as the queue's filter reads it (S1-E10-03b). */
export type ClaimedFilter = 'mine' | 'anyone' | 'nobody' | '';

/** What the queue can be narrowed by. Empty strings mean "all". */
export interface QueueFilters {
  tier: CaseTier | '';
  status: CaseStatus | '';
  reporterUnder18: 'yes' | 'no' | '';
  source: CaseSource | '';
  /** The top reason of the case's reports (S1-E10-03b). */
  reason: ReportReason | '';
  claimed: ClaimedFilter;
  /** A case reference or a username, as typed (S1-E10-03b). */
  search: string;
}

/** The queue as it opens: every open case, most urgent first. */
export const defaultQueueFilters: QueueFilters = {
  tier: '',
  status: 'open',
  reporterUnder18: '',
  source: '',
  reason: '',
  claimed: '',
  search: '',
};

/** Why a call was refused, in words the page can explain. */
export type ModerationFailure = 'not_allowed' | 'refused' | 'not_built' | 'unreachable';

/** The error a refused call throws. */
export class ModerationError extends Error {
  constructor(public readonly failure: ModerationFailure) {
    super(`Moderation call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), refused (23514: the note, an already decided case, a sanction
 *   rule or a story that can't be restricted, QA-9; 23P01: an on-call shift that overlaps another,
 *   S1-E10-09), not_built (0A000: a feature the database doesn't offer yet) or unreachable
 */
export function failureFromCode(code: string | undefined): ModerationFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514' || code === '23P01') return 'refused';
  if (code === '0A000') return 'not_built';
  return 'unreachable';
}

/** The queue row as the database returns it: a composite type, so every field may be null. */
type QueueRow = CompositeTypes<'moderation_queue_row'>;

/**
 * The part of a row that says what the case is: reference, source, tier, the item and the
 * account. A missing value (the composite type allows it) falls back to the safest reading: the
 * longest tier, an unknown age group.
 *
 * @param row - as admin_moderation_queue() returns it
 * @returns those fields
 */
function caseIdentityFromRow(row: QueueRow) {
  return {
    id: row.id ?? '',
    reference: row.reference ?? '',
    source: row.source ?? 'report',
    tier: row.tier ?? 'seven_days',
    status: row.status ?? 'open',
    itemType: row.item_type ?? 'profile',
    itemSummary: row.item_summary ?? '',
    reportedHandle: row.reported_handle,
    reportedUserId: row.reported_user_id ?? '',
    reportedAgeBand: row.reported_age_band ?? 'unknown',
  };
}

/**
 * The part of a row that says how the case is going: the reports' signals, the times and the
 * decision, if any.
 *
 * @param row - as admin_moderation_queue() returns it
 * @returns those fields
 */
function caseProgressFromRow(row: QueueRow) {
  return {
    topReason: row.top_reason,
    reportCount: row.report_count ?? 0,
    reporterUnder18: row.reporter_under_18 ?? false,
    isSafeguarding: row.is_safeguarding ?? false,
    receivedAt: row.received_at ?? '',
    deadlineAt: row.deadline_at ?? '',
    decision: row.decision,
    decidedAt: row.decided_at,
    decidedByHandle: row.decided_by_handle,
    claimedByHandle: row.claimed_by_handle,
    claimedAt: row.claimed_at,
    claimedByMe: row.claimed_by_me ?? false,
  };
}

/**
 * Reads one queue row into the shape the screens use.
 *
 * @param row - as admin_moderation_queue() returns it
 * @returns the case
 */
function caseFromRow(row: QueueRow): QueueCase {
  return { ...caseIdentityFromRow(row), ...caseProgressFromRow(row) };
}

/**
 * Lists the cases the caller may see, most urgent first.
 *
 * @param client - the shared Supabase client
 * @param filters - tier, status, reporter under 18 and source; empty means all
 * @returns the cases
 * Errors: throws ModerationError('not_allowed') for anyone outside moderation staff.
 */
export async function listCases(
  client: AppSupabaseClient,
  filters: QueueFilters,
): Promise<QueueCase[]> {
  const { data, error } = await client.rpc('admin_moderation_queue', {
    tier_filter: filters.tier === '' ? undefined : filters.tier,
    status_filter: filters.status === '' ? undefined : filters.status,
    under_18_filter: filters.reporterUnder18 === '' ? undefined : filters.reporterUnder18 === 'yes',
    source_filter: filters.source === '' ? undefined : filters.source,
    reason_filter: filters.reason === '' ? undefined : filters.reason,
    claimed_filter: filters.claimed === '' ? undefined : filters.claimed,
    search_text: filters.search.trim() === '' ? undefined : filters.search.trim(),
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map(caseFromRow);
}

/**
 * Reads one case, whatever its status.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID (from the queue's link)
 * @returns the case, or null when there is none the caller may see
 * Errors: throws ModerationError('not_allowed') for anyone outside moderation staff.
 */
export async function getCase(
  client: AppSupabaseClient,
  caseId: string,
): Promise<QueueCase | null> {
  // No status filter: the case is wanted whether it is open or decided.
  const { data, error } = await client.rpc('admin_moderation_queue', { case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  const first = data[0];
  return first === undefined ? null : caseFromRow(first);
}

/**
 * A copied-work report's source, or null when the reporter gave none.
 *
 * @param row - the four source columns of admin_case_reports()
 * @returns the source, or null
 */
function copySourceFromRow(row: {
  copy_source_title: string | null;
  copy_source_author: string | null;
  copy_source_reference: string | null;
  copy_source_passage: string | null;
}): CopySource | null {
  const source = {
    title: row.copy_source_title,
    author: row.copy_source_author,
    reference: row.copy_source_reference,
    passage: row.copy_source_passage,
  };
  const hasAnything = Object.values(source).some((value) => value !== null);
  return hasAnything ? source : null;
}

/**
 * Lists a case's reports, oldest first.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the reports with what each reporter wrote
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function listCaseReports(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseReport[]> {
  const { data, error } = await client.rpc('admin_case_reports', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    reference: row.reference,
    reason: row.reason,
    details: row.details,
    reporterHandle: row.reporter_handle,
    reporterAgeBand: row.reporter_age_band,
    createdAt: row.created_at,
    copySource: copySourceFromRow(row),
    reportedPassage: row.reported_passage,
    detailQuestion: row.detail_question,
    detailAnswer: row.detail_answer,
  }));
}

/**
 * Lists a case's decisions.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the decisions, newest first
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function listCaseActions(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseAction[]> {
  const { data, error } = await client.rpc('admin_case_actions', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data.map((row) => ({
    action: row.action,
    note: row.note,
    staffHandle: row.staff_handle,
    createdAt: row.created_at,
  }));
}

/** What a moderator decided. */
export interface Decision {
  action: ModerationAction;
  /** The required note for the case log (staff only). */
  note: string;
  /** For suspend: 1, 7 or 30 (S1-E10-06); ignored otherwise. */
  suspensionDays?: number;
  /** What the person reads in their statement of reasons (S1-E10-04); none for no_action. */
  messageToPerson?: string;
}

/**
 * Saves a decision on an open case.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @param decision - the action, the note, for suspend the days, and the message to the person
 * Errors: throws ModerationError: not_allowed (role, session or safeguarding), refused (a blank
 *   note, a case already decided, a sanction rule or a story that can't be restricted), not_built
 *   or unreachable.
 */
export async function decideCase(
  client: AppSupabaseClient,
  caseId: string,
  decision: Decision,
): Promise<void> {
  const { error } = await client.rpc('admin_decide_case', {
    target_case_id: caseId,
    chosen_action: decision.action,
    note_text: decision.note,
    suspension_days: decision.suspensionDays,
    message_to_person: decision.messageToPerson,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
