/**
 * Statements of reasons and the reports a person sent: what they look like on screen, and how
 * the person reads their own (story S1-E10-04; DSA art. 17 and art. 16(5); board 6.5).
 *
 * Who calls it: hooks/useMyReportsAndDecisions.ts (/my-reports) and the case page's stored
 * statement (src/features/moderation/api/caseStatements.ts uses statementFromJson).
 * What it calls next: my_statements() and my_reports(), which answer only the caller's own rows
 * (…_s1_e10_04_statements_of_reasons.sql). Never a user ID.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One statement of reasons, as the screens draw it. */
export interface StatementOfReasons {
  reference: string;
  action: Enums<'statement_action'>;
  itemType: Enums<'reportable_type'> | null;
  itemSummary: string | null;
  /** Staff's words to the person: the facts and circumstances. */
  facts: string | null;
  /** terms: our community rules; law: an illegal-content rule or an authority order. */
  ground: Enums<'statement_ground'>;
  /** The rule's key: a report reason, authority_order, picture_check, community_rules, … */
  groundKey: string;
  automatedDetection: boolean;
  automatedDecision: boolean;
  restrictionEndsAt: string | null;
  appealUntil: string;
  canChallenge: boolean;
  /** True while the six months last and no appeal is open (S1-E10-07). */
  canAppeal: boolean;
  /** The latest appeal against this decision, if any (S1-E10-07). */
  appeal: StatementAppeal | null;
  issuedAt: string;
  caseReference: string | null;
}

/** An appeal against a decision, as the person sees it (S1-E10-07; DSA art. 20). */
export interface StatementAppeal {
  reference: string;
  status: Enums<'appeal_status'>;
  createdAt: string;
  decidedAt: string | null;
  /** The moderator's words to the person once decided (art. 20(5)). */
  message: string | null;
}

/** Why the statement couldn't be read. */
export type StatementFailure = 'signed_out' | 'unreachable';

/** The error a failed read throws. */
export class StatementError extends Error {
  constructor(public readonly failure: StatementFailure) {
    super(`Statement call failed: ${failure}`);
  }
}

/**
 * Reads a text field of the JSON, or null.
 *
 * @param record - the JSON object
 * @param key - the field
 * @returns the text, or null when it is missing or not text
 */
function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Reads the appeal part of statement_json().
 *
 * @param json - the "appeal" field
 * @returns the appeal, or null when there is none
 */
function appealFromJson(json: Json | undefined): StatementAppeal | null {
  if (json === null || json === undefined || typeof json !== 'object' || Array.isArray(json))
    return null;
  const statuses: Enums<'appeal_status'>[] = ['open', 'upheld', 'overturned'];
  return {
    reference: textOf(json, 'reference') ?? '',
    status: statuses.find((status) => status === json.status) ?? 'open',
    createdAt: textOf(json, 'created_at') ?? '',
    decidedAt: textOf(json, 'decided_at'),
    message: textOf(json, 'message'),
  };
}

/**
 * Reads statement_json() into the shape the screens use.
 *
 * @param json - as the database returns it
 * @returns the statement, or null when there is none
 */
export function statementFromJson(json: Json | null): StatementOfReasons | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
  return {
    reference: textOf(json, 'reference') ?? '',
    action: (textOf(json, 'action') ?? 'warn') as Enums<'statement_action'>,
    itemType: textOf(json, 'item_type') as Enums<'reportable_type'> | null,
    itemSummary: textOf(json, 'item_summary'),
    facts: textOf(json, 'facts'),
    ground: textOf(json, 'ground') === 'law' ? 'law' : 'terms',
    groundKey: textOf(json, 'ground_key') ?? 'community_rules',
    automatedDetection: json.automated_detection === true,
    automatedDecision: json.automated_decision === true,
    restrictionEndsAt: textOf(json, 'restriction_ends_at'),
    appealUntil: textOf(json, 'appeal_until') ?? '',
    canChallenge: json.can_challenge === true,
    canAppeal: json.can_appeal === true,
    appeal: appealFromJson(json.appeal),
    issuedAt: textOf(json, 'issued_at') ?? '',
    caseReference: textOf(json, 'case_reference'),
  };
}

/** One report the person sent, with what came of it. */
export interface MyReport {
  reference: string;
  reason: Enums<'report_reason'>;
  itemType: Enums<'reportable_type'> | null;
  itemSummary: string | null;
  sentAt: string;
  isDecided: boolean;
  /** removed, acted or no_action: never which sanction someone else got. */
  outcome: 'removed' | 'acted' | 'no_action' | null;
  decidedAt: string | null;
}

/**
 * Reads one report from my_reports().
 *
 * @param json - one entry of the array
 * @returns the report
 */
function reportFromJson(json: Record<string, Json | undefined>): MyReport {
  const outcome = textOf(json, 'outcome');
  return {
    reference: textOf(json, 'reference') ?? '',
    reason: (textOf(json, 'reason') ?? 'other') as Enums<'report_reason'>,
    itemType: textOf(json, 'item_type') as Enums<'reportable_type'> | null,
    itemSummary: textOf(json, 'item_summary'),
    sentAt: textOf(json, 'sent_at') ?? '',
    isDecided: json.is_decided === true,
    outcome:
      outcome === 'removed' || outcome === 'acted' || outcome === 'no_action' ? outcome : null,
    decidedAt: textOf(json, 'decided_at'),
  };
}

/**
 * Keeps the objects of a JSON array.
 *
 * @param json - as the database returns it
 * @returns the entries that are objects
 */
function objectsOf(json: Json | null): Record<string, Json | undefined>[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (entry): entry is Record<string, Json | undefined> =>
      entry !== null && typeof entry === 'object' && !Array.isArray(entry),
  );
}

/**
 * Reads the caller's own statements, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the statements
 * Errors: throws StatementError: signed_out (42501) or unreachable.
 */
export async function fetchMyStatements(client: AppSupabaseClient): Promise<StatementOfReasons[]> {
  const { data, error } = await client.rpc('my_statements');
  if (error !== null)
    throw new StatementError(error.code === '42501' ? 'signed_out' : 'unreachable');
  return objectsOf(data).flatMap((entry) => statementFromJson(entry) ?? []);
}

/**
 * Reads the reports the caller sent, newest first.
 *
 * @param client - the shared Supabase client
 * @returns the reports with their outcome
 * Errors: throws StatementError: signed_out (42501) or unreachable.
 */
export async function fetchMyReports(client: AppSupabaseClient): Promise<MyReport[]> {
  const { data, error } = await client.rpc('my_reports');
  if (error !== null)
    throw new StatementError(error.code === '42501' ? 'signed_out' : 'unreachable');
  return objectsOf(data).map(reportFromJson);
}

/** Why an appeal wasn't sent (S1-E10-07). */
export type AppealFailure = 'refused' | 'too_many' | 'not_found' | 'unreachable';

/** The error a refused appeal throws; waitMinutes is set for too_many. */
export class AppealError extends Error {
  constructor(
    public readonly failure: AppealFailure,
    public readonly waitMinutes: number | null = null,
  ) {
    super(`Appeal failed: ${failure}`);
  }
}

/** The longest explanation an appeal takes (the database's limit). */
export const appealExplanationLimit = 4000;

/**
 * Appeals a decision on the caller's own statement of reasons (DSA art. 20: free, electronic,
 * within six months).
 *
 * @param client - the shared Supabase client
 * @param statementReference - the statement's reference, for example "S-000012"
 * @param explanation - why the person thinks the decision is wrong
 * @returns the appeal's reference
 * @throws AppealError: refused (23514: expired, already open or empty), too_many (54000, with
 *   the minutes to wait), not_found (P0002: not their statement) or unreachable
 */
export async function submitAppeal(
  client: AppSupabaseClient,
  statementReference: string,
  explanation: string,
): Promise<string> {
  const { data, error } = await client.rpc('submit_appeal', {
    statement_reference: statementReference,
    explanation,
  });
  if (error !== null) {
    if (error.code === '54000') {
      const minutes = /wait_minutes:(\d+)/.exec(error.hint ?? '')?.[1];
      throw new AppealError('too_many', minutes === undefined ? null : Number(minutes));
    }
    if (error.code === '23514') throw new AppealError('refused');
    if (error.code === 'P0002') throw new AppealError('not_found');
    throw new AppealError('unreachable');
  }
  const answer = data as { reference?: string } | null;
  return answer?.reference ?? '';
}
