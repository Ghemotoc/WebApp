/**
 * The safeguarding path: moving a case into the safeguarding lane, the support contacts for the
 * person's country, the evidence pack and the referral log (story S1-E10-10; DSA art. 18).
 *
 * Who calls it: hooks/useSafeguarding.ts (the case page's safeguarding panel and "Move to
 * safeguarding"). What it calls next: admin_mark_safeguarding(), admin_case_support_contacts(),
 * admin_build_evidence_pack(), admin_log_referral() and admin_case_referrals()
 * (…_s1_e10_10_safeguarding.sql). Only staff with the safeguarding permission build a pack or
 * log a referral; building a pack is logged as a sensitive read.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** One safety contact for the person's country. */
export interface SupportContact {
  kind: string;
  label: string;
  phoneNumber: string | null;
  link: string | null;
  openingHours: string | null;
  note: string | null;
}

/** The contacts and whose country they are for. */
export interface SupportContacts {
  countryCode: string;
  /** True when the person's country had none and Romania's are shown. */
  isFallback: boolean;
  contacts: SupportContact[];
}

/** One referral to an authority. */
export interface Referral {
  authorityName: string;
  authorityReference: string | null;
  note: string | null;
  referredAt: string;
  referredBy: string;
}

/** A JSON object. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as a list of objects.
 *
 * @returns the objects in it
 */
function listOf(json: Json | undefined): JsonObject[] {
  if (!Array.isArray(json)) return [];
  return json.filter(
    (entry): entry is JsonObject =>
      entry !== null && typeof entry === 'object' && !Array.isArray(entry),
  );
}

/**
 * Reads a text field, or null.
 *
 * @returns the text
 */
function text(record: JsonObject, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Moves an open case into the safeguarding lane.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @param reason - why
 * Errors: throws ModerationError: not_allowed, refused (no reason, decided or already there) or
 *   unreachable.
 */
export async function markSafeguarding(
  client: AppSupabaseClient,
  caseId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_mark_safeguarding', {
    target_case_id: caseId,
    reason_given: reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Reads the support contacts for the person in a case.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the contacts
 * Errors: throws ModerationError('not_allowed') when the caller may not see the case.
 */
export async function fetchSupportContacts(
  client: AppSupabaseClient,
  caseId: string,
): Promise<SupportContacts> {
  const { data, error } = await client.rpc('admin_case_support_contacts', {
    target_case_id: caseId,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  const answer = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return {
    countryCode: text(answer, 'country_code') ?? 'RO',
    isFallback: answer.is_fallback === true,
    contacts: listOf(answer.contacts).map((contact) => ({
      kind: text(contact, 'kind') ?? '',
      label: text(contact, 'label') ?? '',
      phoneNumber: text(contact, 'phone_number'),
      link: text(contact, 'link'),
      openingHours: text(contact, 'opening_hours'),
      note: text(contact, 'note'),
    })),
  };
}

/**
 * Builds the evidence pack (logged as a sensitive read).
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @param reason - why a pack is needed
 * @returns the pack, as JSON, ready to save
 * Errors: throws ModerationError: not_allowed (no safeguarding permission), refused (no reason)
 *   or unreachable.
 */
export async function buildEvidencePack(
  client: AppSupabaseClient,
  caseId: string,
  reason: string,
): Promise<Json> {
  const { data, error } = await client.rpc('admin_build_evidence_pack', {
    target_case_id: caseId,
    reason_given: reason,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return data;
}

/** A referral to log. */
export interface NewReferral {
  authorityName: string;
  authorityReference: string;
  note: string;
}

/**
 * Logs a referral to an authority.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @param referral - to whom, their reference and a note
 * Errors: throws ModerationError: not_allowed, refused (no authority) or unreachable.
 */
export async function logReferral(
  client: AppSupabaseClient,
  caseId: string,
  referral: NewReferral,
): Promise<void> {
  const { error } = await client.rpc('admin_log_referral', {
    target_case_id: caseId,
    authority_name: referral.authorityName,
    authority_reference: referral.authorityReference,
    note_text: referral.note,
  });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}

/**
 * Lists a case's referrals.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the referrals, oldest first
 * Errors: throws ModerationError('not_allowed') without the safeguarding permission.
 */
export async function listReferrals(
  client: AppSupabaseClient,
  caseId: string,
): Promise<Referral[]> {
  const { data, error } = await client.rpc('admin_case_referrals', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return listOf(data).map((row) => ({
    authorityName: text(row, 'authority_name') ?? '',
    authorityReference: text(row, 'authority_reference'),
    note: text(row, 'note'),
    referredAt: text(row, 'referred_at') ?? '',
    referredBy: text(row, 'referred_by') ?? '',
  }));
}
