/**
 * Calls for submissions: the hub's list of open calls and the staff list (bundle GAPS-12d; board
 * WritersHub, "Calls for submissions").
 *
 * Who calls it: hooks/useHubCalls.ts (the hub list) and hooks/useStaffCalls.ts (the staff page
 * at /staff/hub).
 * What it calls next (migration gaps12d_submission_calls):
 * - writers_hub_calls(): the calls still open today, soonest closing first; a paid call only for
 *   an adult. Members can't read the table itself.
 * - the submission_calls table (read by staff with the contests area through its RLS policy),
 *   admin_save_submission_call() and admin_delete_submission_call(), which check the same area
 *   and write the audit log.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { hubStaffErrorFrom } from './hubStaffErrors';

/** One call as the hub and the staff page show it. */
export interface SubmissionCall {
  id: string;
  titleRo: string;
  titleEn: string;
  detailsRo: string;
  detailsEn: string;
  /** The organiser's own page about the call (https). */
  linkUrl: string;
  /** The last day to send work (YYYY-MM-DD, Romania time, included). */
  closesOn: string;
  /** True when the organiser pays for the work they take. */
  isPaid: boolean;
}

/** What staff fill in to add or change a call; id is null for a new one. */
export type CallDraft = Omit<SubmissionCall, 'id'> & { id: string | null };

/** The longest each text may be; the database checks the same limits. */
export const callLimits = { title: 120, details: 300, link: 500 } as const;

/**
 * The calls still open today, soonest closing first (at most 12).
 *
 * @param client - the shared Supabase client
 * @returns the calls; empty when there are none for this writer
 * @throws when the read fails
 */
export async function fetchHubCalls(client: AppSupabaseClient): Promise<SubmissionCall[]> {
  const { data, error } = await client.rpc('writers_hub_calls');
  if (error !== null) throw new Error(`Could not read the calls for submissions: ${error.message}`);
  return data.map((row) => ({
    id: row.call_id,
    titleRo: row.title_ro,
    titleEn: row.title_en,
    detailsRo: row.details_ro,
    detailsEn: row.details_en,
    linkUrl: row.link_url,
    closesOn: row.closes_on,
    isPaid: row.is_paid,
  }));
}

/**
 * Every call that isn't deleted, latest closing day first, for staff (closed ones included).
 *
 * @param client - the shared Supabase client
 * @returns the calls; empty for anyone without the contests area (the policy shows them none)
 * @throws when the read fails
 */
export async function fetchStaffCalls(client: AppSupabaseClient): Promise<SubmissionCall[]> {
  const { data, error } = await client
    .from('submission_calls')
    .select('id, title_ro, title_en, details_ro, details_en, link_url, closes_on, is_paid')
    .order('closes_on', { ascending: false });
  if (error !== null) throw new Error(`Could not read the calls for submissions: ${error.message}`);
  return data.map((row) => ({
    id: row.id,
    titleRo: row.title_ro,
    titleEn: row.title_en,
    detailsRo: row.details_ro,
    detailsEn: row.details_en,
    linkUrl: row.link_url,
    closesOn: row.closes_on,
    isPaid: row.is_paid,
  }));
}

/**
 * Adds a call, or changes one; logged with the before and after values.
 *
 * @param client - the shared Supabase client
 * @param draft - the texts in both languages, the link, the last day and whether it pays
 * @returns the call's ID
 * @throws HubStaffError
 */
export async function saveCall(client: AppSupabaseClient, draft: CallDraft): Promise<string> {
  const { data, error } = await client.rpc('admin_save_submission_call', {
    // The generated types want a string; null is how a new call is asked for.
    call_id: draft.id as string,
    call: {
      title_ro: draft.titleRo,
      title_en: draft.titleEn,
      details_ro: draft.detailsRo,
      details_en: draft.detailsEn,
      link_url: draft.linkUrl,
      closes_on: draft.closesOn,
      is_paid: draft.isPaid,
    },
  });
  if (error !== null) throw hubStaffErrorFrom(error);
  return data;
}

/**
 * Takes a call off the hub and the staff list; the audit log keeps what it said.
 *
 * @param client - the shared Supabase client
 * @param callId - the call to delete
 * @throws HubStaffError
 */
export async function deleteCall(client: AppSupabaseClient, callId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_submission_call', { call_id: callId });
  if (error !== null) throw hubStaffErrorFrom(error);
}
