/**
 * The evidence about a suspected child sexual abuse image, on its safeguarding case (bundle
 * ADMIN-2, part e2b; Robert's brief of 2 Nov 2026, section 4).
 *
 * The image itself is deleted at once and never kept; what is kept is the case, the account, the
 * times, the scrambled IP address, the file's SHA-256 hash and a description for the police, for
 * 5 years or longer under a legal hold.
 * Who calls it: hooks/useAbuseImageEvidence.ts (AbuseImageEvidencePanel on the case page).
 * What it calls next: admin_abuse_image_evidence(), admin_describe_abuse_image(),
 * admin_set_evidence_hold() and admin_close_account_for_abuse_image()
 * (…_admin2_e2b_abuse_image_evidence.sql). Each checks the safeguarding permission and writes
 * the audit log in the same transaction.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** The evidence, as the case page shows it (never the scrambled IP itself). */
export interface AbuseImageEvidence {
  id: string;
  source: 'moderator' | 'known_image_match';
  uploadedAt: string;
  reportedAt: string;
  fileSha256: string | null;
  hasScrambledIp: boolean;
  /** The month whose key scrambled the IP ("2026-11"), or null. */
  ipPeriod: string | null;
  description: string;
  describedBy: string | null;
  keepUntil: string;
  legalHold: boolean;
  legalHoldReason: string | null;
  accountClosed: boolean;
  uploaderIsStaff: boolean;
  /** The uploader's language, for the message they get when their account is closed. */
  uploaderLocale: string;
}

/** A JSON object's fields, or an empty object for anything else. */
function fieldsOf(value: Json | null): Record<string, Json | undefined> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  return value;
}

/** Reads a text field, or null. */
function textOrNull(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Turns the database's JSON into the evidence, or null when the case has none.
 *
 * @param value - what admin_abuse_image_evidence() returned
 * @returns the evidence, or null
 */
export function evidenceFrom(value: Json | null): AbuseImageEvidence | null {
  const fields = fieldsOf(value);
  const id = textOrNull(fields, 'id');
  if (id === null) return null;
  return {
    id,
    source: textOrNull(fields, 'source') === 'moderator' ? 'moderator' : 'known_image_match',
    uploadedAt: textOrNull(fields, 'uploadedAt') ?? '',
    reportedAt: textOrNull(fields, 'reportedAt') ?? '',
    fileSha256: textOrNull(fields, 'fileSha256'),
    hasScrambledIp: fields.hasScrambledIp === true,
    ipPeriod: textOrNull(fields, 'ipPeriod'),
    description: textOrNull(fields, 'description') ?? '',
    describedBy: textOrNull(fields, 'describedBy'),
    keepUntil: textOrNull(fields, 'keepUntil') ?? '',
    legalHold: fields.legalHold === true,
    legalHoldReason: textOrNull(fields, 'legalHoldReason'),
    accountClosed: fields.accountClosed === true,
    uploaderIsStaff: fields.uploaderIsStaff === true,
    uploaderLocale: textOrNull(fields, 'uploaderLocale') ?? 'ro',
  };
}

/**
 * Reads the evidence about a case's picture.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the evidence, or null when the case has none
 * Errors: throws ModerationError('not_allowed') without the safeguarding permission.
 */
export async function fetchAbuseImageEvidence(
  client: AppSupabaseClient,
  caseId: string,
): Promise<AbuseImageEvidence | null> {
  const { data, error } = await client.rpc('admin_abuse_image_evidence', {
    target_case_id: caseId,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return evidenceFrom(data);
}

/** One change a safeguarding moderator makes to the evidence or the account. */
export type EvidenceChange =
  | { kind: 'describe'; evidenceId: string; description: string }
  | { kind: 'hold'; evidenceId: string; shouldHold: boolean; reason: string }
  | { kind: 'close_account'; caseId: string; note: string; message: string };

/**
 * Sends one change.
 *
 * @param client - the shared Supabase client
 * @param change - the change
 * Errors: throws ModerationError: 'refused' for a blank or too long text, 'not_allowed' without
 *   the safeguarding permission.
 */
export async function changeEvidence(
  client: AppSupabaseClient,
  change: EvidenceChange,
): Promise<void> {
  let result: { error: { code: string } | null };
  if (change.kind === 'describe') {
    result = await client.rpc('admin_describe_abuse_image', {
      evidence_id: change.evidenceId,
      description_text: change.description,
    });
  } else if (change.kind === 'hold') {
    result = await client.rpc('admin_set_evidence_hold', {
      evidence_id: change.evidenceId,
      should_hold: change.shouldHold,
      reason_given: change.reason,
    });
  } else {
    result = await client.rpc('admin_close_account_for_abuse_image', {
      target_case_id: change.caseId,
      note_text: change.note,
      account_message: change.message,
    });
  }
  if (result.error !== null) throw new ModerationError(failureFromCode(result.error.code));
}
