/**
 * Reads the safety contacts of a country and notes a gap (story S1-E10-13a).
 *
 * Who calls it: hooks/useSafetyContacts.ts.
 * What it calls next: the safety_contacts table (readable by everyone, policy
 * safety_contacts_select_public) and note_safety_contact_gap() (…_s1_e10_13a_safety_contacts.sql).
 * Numbers and links come only from the table, which is seeded from the researched file; nothing
 * here is typed from memory (the story's legal note).
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What a contact is for, as the database lists them. */
export type SafetyContactKind = Enums<'safety_contact_kind'>;

/** The kinds the block shows, in order (decided 23 Oct 2026, Q9a); the others are for staff. */
export const shownKinds: SafetyContactKind[] = [
  'emergency',
  'child_helpline',
  'csam_hotline',
  'crisis_youth',
];

/** One contact as the block shows it. */
export interface SafetyContact {
  id: string;
  kind: SafetyContactKind;
  label: string;
  phoneNumber: string | null;
  link: string | null;
  openingHours: string | null;
  lastCheckedOn: string;
}

/**
 * Reads the shown contacts of one country, in the block's order.
 *
 * @param client - the shared Supabase client
 * @param countryCode - ISO 3166-1 alpha-2, upper case
 * @returns the contacts; empty when the country has no row
 * Errors: throws when the read fails.
 */
export async function fetchSafetyContacts(
  client: AppSupabaseClient,
  countryCode: string,
): Promise<SafetyContact[]> {
  const { data, error } = await client
    .from('safety_contacts')
    .select('id, kind, label, phone_number, link, opening_hours, last_checked_on, position')
    .eq('country_code', countryCode)
    .in('kind', shownKinds)
    .order('position');
  if (error !== null) throw new Error(error.message);
  const rows = data.map((row) => ({
    id: row.id,
    kind: row.kind,
    label: row.label,
    phoneNumber: row.phone_number,
    link: row.link,
    openingHours: row.opening_hours,
    lastCheckedOn: row.last_checked_on,
  }));
  // The block's order is by kind, then by the file's position inside the kind.
  return rows.sort(
    (first, second) => shownKinds.indexOf(first.kind) - shownKinds.indexOf(second.kind),
  );
}

/**
 * Tells the database a country had no contacts, so staff see the gap. Never who asked.
 *
 * @param client - the shared Supabase client
 * @param countryCode - the country asked for
 * Errors: none thrown; a failed note is logged without personal data and the block carries on.
 */
export async function noteSafetyContactGap(
  client: AppSupabaseClient,
  countryCode: string,
): Promise<void> {
  const { error } = await client.rpc('note_safety_contact_gap', {
    wanted_country_code: countryCode,
  });
  if (error !== null) console.warn('Could not note the safety contacts gap.');
}
