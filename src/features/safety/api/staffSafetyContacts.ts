/**
 * Staff › Safety contacts: read every contact, the monthly checks and the 45-day warnings, and
 * add, change, confirm or remove a contact (story S1-E10-13, part b; Robert's canvas comment on
 * 7.3: "create a task for the support team every month to check the numbers are up to date").
 *
 * Who calls it: hooks/useStaffSafetyContacts.ts and hooks/useSafetyContactWarnings.ts.
 * What it calls next: the safety_contacts table (readable by everyone) and admin_save_safety_contact(),
 * admin_confirm_safety_contact(), admin_remove_safety_contact(), admin_safety_contact_checks() and
 * admin_safety_contact_warnings() (…_s1_e10_13b_safety_contacts_admin.sql). The database checks
 * the staff area and writes the audit log; this file only shapes the answers.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { SafetyContactKind } from './safetyContacts';

/** Why a staff action on the contacts failed, for the page's message. */
export type SafetyAdminFailure = 'not_allowed' | 'invalid' | 'not_found' | 'unreachable';

/** A failed staff action, carrying the reason the page shows. */
export class SafetyAdminError extends Error {
  readonly failure: SafetyAdminFailure;

  constructor(failure: SafetyAdminFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Turns a database error into a failure the page can word.
 *
 * @param error - the error Supabase answered
 * @returns the matching SafetyAdminError
 */
function adminErrorFrom(error: { code?: string; message: string }): SafetyAdminError {
  if (error.code === '42501') return new SafetyAdminError('not_allowed', error.message);
  if (error.code === '23514' || error.code === '22023') {
    return new SafetyAdminError('invalid', error.message);
  }
  if (error.code === 'P0002') return new SafetyAdminError('not_found', error.message);
  return new SafetyAdminError('unreachable', error.message);
}

/** One contact as staff see and edit it. */
export interface StaffSafetyContact {
  id: string;
  countryCode: string;
  kind: SafetyContactKind;
  position: number;
  label: string;
  phoneNumber: string | null;
  link: string | null;
  openingHours: string | null;
  openingHoursRo: string | null;
  note: string | null;
  confidence: string;
  lastCheckedOn: string;
  checkedBy: string;
}

/** What the edit form sends: an ID to change a contact, none to add one. */
export interface SafetyContactDraft {
  id: string | null;
  countryCode: string;
  kind: SafetyContactKind;
  position: number;
  label: string;
  phoneNumber: string;
  link: string;
  openingHours: string;
  openingHoursRo: string;
  note: string;
  confidence: string;
}

/** One country's monthly check (criterion 7). */
export interface SafetyContactCheck {
  countryCode: string;
  checkMonth: string;
  contactCount: number;
  stillToConfirm: number;
  closedAt: string | null;
  closedByHandle: string | null;
}

/** A contact not confirmed for 45 days (criterion 8). */
export interface SafetyContactWarning {
  id: string;
  countryCode: string;
  label: string;
  lastCheckedOn: string;
  daysSince: number;
}

/**
 * Reads every contact, by country and then by the order the block shows.
 *
 * @param client - the shared Supabase client
 * @returns the contacts
 * Errors: throws SafetyAdminError when the read fails.
 */
export async function fetchAllSafetyContacts(
  client: AppSupabaseClient,
): Promise<StaffSafetyContact[]> {
  const { data, error } = await client
    .from('safety_contacts')
    .select(
      'id, country_code, kind, position, label, phone_number, link, opening_hours, opening_hours_ro, note, confidence, last_checked_on, checked_by',
    )
    .order('country_code')
    .order('kind')
    .order('position');
  if (error !== null) throw adminErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    countryCode: row.country_code,
    kind: row.kind,
    position: row.position,
    label: row.label,
    phoneNumber: row.phone_number,
    link: row.link,
    openingHours: row.opening_hours,
    openingHoursRo: row.opening_hours_ro,
    note: row.note,
    confidence: row.confidence,
    lastCheckedOn: row.last_checked_on,
    checkedBy: row.checked_by,
  }));
}

/**
 * Reads the monthly checks, open ones first.
 *
 * @param client - the shared Supabase client
 * @returns the checks
 * Errors: throws SafetyAdminError ('not_allowed' for anyone without the area).
 */
export async function fetchSafetyContactChecks(
  client: AppSupabaseClient,
): Promise<SafetyContactCheck[]> {
  const { data, error } = await client.rpc('admin_safety_contact_checks');
  if (error !== null) throw adminErrorFrom(error);
  return data.map((row) => ({
    countryCode: row.country_code,
    checkMonth: row.check_month,
    contactCount: row.contact_count,
    stillToConfirm: row.still_to_confirm,
    closedAt: row.closed_at,
    closedByHandle: row.closed_by_handle,
  }));
}

/**
 * Reads the contacts nobody confirmed for 45 days.
 *
 * @param client - the shared Supabase client
 * @returns the warnings, oldest check first
 * Errors: throws SafetyAdminError ('not_allowed' for anyone without the area).
 */
export async function fetchSafetyContactWarnings(
  client: AppSupabaseClient,
): Promise<SafetyContactWarning[]> {
  const { data, error } = await client.rpc('admin_safety_contact_warnings');
  if (error !== null) throw adminErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    countryCode: row.country_code,
    label: row.label,
    lastCheckedOn: row.last_checked_on,
    daysSince: row.days_since,
  }));
}

/**
 * An optional text field as the database wants it: blank becomes null.
 *
 * @param value - what was typed
 * @returns the trimmed text, or null
 */
function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Adds or changes a contact. Saving counts as a check by the caller (criterion 6).
 *
 * @param client - the shared Supabase client
 * @param draft - the form's values
 * @returns the contact's ID
 * Errors: throws SafetyAdminError ('invalid' for a link that isn't https or a contact with neither
 *   a number nor a link; 'not_allowed' for moderators and members).
 */
export async function saveSafetyContact(
  client: AppSupabaseClient,
  draft: SafetyContactDraft,
): Promise<string> {
  const contact: { [key: string]: Json } = {
    country_code: draft.countryCode,
    kind: draft.kind,
    position: draft.position,
    label: draft.label.trim(),
    phone_number: optional(draft.phoneNumber),
    link: optional(draft.link),
    opening_hours: optional(draft.openingHours),
    opening_hours_ro: optional(draft.openingHoursRo),
    note: optional(draft.note),
    confidence: draft.confidence,
  };
  // Step 1: an ID changes that contact; without one the database adds a new contact.
  if (draft.id !== null) contact.id = draft.id;
  const { data, error } = await client.rpc('admin_save_safety_contact', { contact });
  if (error !== null) throw adminErrorFrom(error);
  return data;
}

/**
 * Records that a contact was checked against its official source and is still right.
 *
 * @param client - the shared Supabase client
 * @param contactId - the contact
 * Errors: throws SafetyAdminError.
 */
export async function confirmSafetyContact(
  client: AppSupabaseClient,
  contactId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_confirm_safety_contact', {
    target_contact_id: contactId,
  });
  if (error !== null) throw adminErrorFrom(error);
}

/**
 * Removes a contact that no longer exists. The reason goes to the audit log.
 *
 * @param client - the shared Supabase client
 * @param contactId - the contact
 * @param reason - why it was removed (required)
 * Errors: throws SafetyAdminError ('invalid' for a blank reason).
 */
export async function removeSafetyContact(
  client: AppSupabaseClient,
  contactId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_safety_contact', {
    target_contact_id: contactId,
    reason_given: reason.trim(),
  });
  if (error !== null) throw adminErrorFrom(error);
}
