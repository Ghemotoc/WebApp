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
  issuedAt: string;
  caseReference: string | null;
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
