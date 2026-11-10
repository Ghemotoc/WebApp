/**
 * Writer of the week: the hub's card, the picked writer's own invitations and the staff list
 * (bundle GAPS-12e; board WritersHub, "Writer of the week · staff pick").
 *
 * Who calls it: hooks/useHubSpotlight.ts (the hub) and hooks/useStaffSpotlights.ts (the staff
 * page at /staff/hub).
 * What it calls next (migration gaps12e_writer_spotlights):
 * - writers_hub_spotlight(): this week's pick, only once the writer agreed;
 * - my_writer_spotlights() and answer_writer_spotlight(): the picked writer's invitations and
 *   their answer, which they can change until the week ends;
 * - admin_writer_spotlights(), admin_invite_writer_spotlight() and
 *   admin_delete_writer_spotlight(), which check the contests area and write the audit log.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { hubStaffErrorFrom } from './hubStaffErrors';

/** The writer's answer to an invitation. */
export type SpotlightAnswer = 'waiting' | 'agreed' | 'declined';

/** This week's writer as the hub shows them. */
export interface HubSpotlight {
  handle: string;
  displayName: string;
  /** Staff's line on why, in each language. */
  reasonRo: string;
  reasonEn: string;
}

/** The hub's card: the writer, and whether the reader is that writer (no Follow then). */
export interface HubSpotlightCard extends HubSpotlight {
  isMe: boolean;
}

/** One of the caller's own invitations. */
export interface SpotlightInvitation {
  id: string;
  /** The first and last day it would show (YYYY-MM-DD, Romania time). */
  startsOn: string;
  endsOn: string;
  reasonRo: string;
  reasonEn: string;
  answer: SpotlightAnswer;
}

/** One pick on the staff page. */
export interface StaffSpotlight extends HubSpotlight {
  id: string;
  startsOn: string;
  answer: SpotlightAnswer;
}

/** What staff fill in to invite a writer. */
export interface SpotlightDraft {
  handle: string;
  startsOn: string;
  reasonRo: string;
  reasonEn: string;
}

/** The longest the line may be; the database checks the same limit. */
export const spotlightReasonLimit = 300;

/**
 * Reads an answer the database sent, falling back to "waiting" for a word this version doesn't
 * know, so an unknown answer never shows a writer who hasn't agreed.
 *
 * @param answer - the database's word
 * @returns the answer
 */
export function spotlightAnswerFrom(answer: string): SpotlightAnswer {
  return answer === 'agreed' || answer === 'declined' ? answer : 'waiting';
}

/**
 * This week's writer of the week.
 *
 * @param client - the shared Supabase client
 * @returns the writer, or null when nobody agreed to be shown this week
 * @throws when the read fails
 */
export async function fetchHubSpotlight(
  client: AppSupabaseClient,
): Promise<HubSpotlightCard | null> {
  const { data, error } = await client.rpc('writers_hub_spotlight');
  if (error !== null) throw new Error(`Could not read the writer of the week: ${error.message}`);
  const row = data[0];
  if (row === undefined) return null;
  return {
    handle: row.handle,
    displayName: row.display_name,
    reasonRo: row.reason_ro,
    reasonEn: row.reason_en,
    isMe: row.is_me,
  };
}

/**
 * The caller's own invitations that haven't ended, soonest first.
 *
 * @param client - the shared Supabase client
 * @returns the invitations; empty for almost everyone
 * @throws when the read fails
 */
export async function fetchMySpotlights(client: AppSupabaseClient): Promise<SpotlightInvitation[]> {
  const { data, error } = await client.rpc('my_writer_spotlights');
  if (error !== null) throw new Error(`Could not read the invitations: ${error.message}`);
  return data.map((row) => ({
    id: row.spotlight_id,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    reasonRo: row.reason_ro,
    reasonEn: row.reason_en,
    answer: spotlightAnswerFrom(row.answer),
  }));
}

/**
 * The picked writer agrees to be shown, or declines.
 *
 * @param client - the shared Supabase client
 * @param spotlightId - the invitation
 * @param agrees - true to be shown, false to decline or withdraw
 * @throws when the invitation is gone or the call fails
 */
export async function answerSpotlight(
  client: AppSupabaseClient,
  spotlightId: string,
  agrees: boolean,
): Promise<void> {
  const { error } = await client.rpc('answer_writer_spotlight', {
    spotlight_id: spotlightId,
    agrees,
  });
  if (error !== null) throw new Error(`Could not save the answer: ${error.message}`);
}

/**
 * The picks for staff, newest first, each with the writer's answer.
 *
 * @param client - the shared Supabase client
 * @returns the picks
 * @throws HubStaffError (not_allowed without the contests area)
 */
export async function fetchStaffSpotlights(client: AppSupabaseClient): Promise<StaffSpotlight[]> {
  const { data, error } = await client.rpc('admin_writer_spotlights');
  if (error !== null) throw hubStaffErrorFrom(error);
  return data.map((row) => ({
    id: row.spotlight_id,
    handle: row.handle,
    displayName: row.display_name,
    startsOn: row.starts_on,
    reasonRo: row.reason_ro,
    reasonEn: row.reason_en,
    answer: spotlightAnswerFrom(row.answer),
  }));
}

/**
 * Invites a writer to be writer of the week; nothing shows until they agree. Logged.
 *
 * @param client - the shared Supabase client
 * @param draft - the username, the first day and the line in both languages
 * @returns the pick's ID
 * @throws HubStaffError
 */
export async function inviteSpotlight(
  client: AppSupabaseClient,
  draft: SpotlightDraft,
): Promise<string> {
  const { data, error } = await client.rpc('admin_invite_writer_spotlight', {
    target_handle: draft.handle,
    first_day: draft.startsOn,
    reason_ro: draft.reasonRo,
    reason_en: draft.reasonEn,
  });
  if (error !== null) throw hubStaffErrorFrom(error);
  return data;
}

/**
 * Takes a pick off the hub, the writer's invitations and the staff list. Logged.
 *
 * @param client - the shared Supabase client
 * @param spotlightId - the pick to delete
 * @throws HubStaffError
 */
export async function deleteSpotlight(
  client: AppSupabaseClient,
  spotlightId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_delete_writer_spotlight', {
    spotlight_id: spotlightId,
  });
  if (error !== null) throw hubStaffErrorFrom(error);
}
