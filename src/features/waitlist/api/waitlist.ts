/**
 * The waiting list's calls: the holding page's own place, and Staff › Waitlist (bundle WAITLIST-1,
 * story S1-E2-24).
 *
 * Who calls it: hooks/useMyWaitlist.ts and hooks/useStaffWaitlist.ts.
 * What it calls next: my_waitlist(), set_my_waitlist_interest(), admin_waitlist(),
 * admin_admit_from_waitlist() and admin_admit_waitlist_wave() (…_waitlist1_02_waitlist.sql). The
 * database checks who may ask and writes the audit log; this file only passes the answers on and
 * reads them with zod, so a changed answer fails loudly instead of drawing nonsense.
 * Privacy: the staff list carries an entry ID, the username and the country, never the user ID or
 * the email (CLAUDE.md rule 15).
 */
import { z } from 'zod';

import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** What a person comes for: write, read or both (the database's waitlist_interest). */
export type WaitlistInterest = Enums<'waitlist_interest'>;

/** The staff filters: writers ('write', which includes both), readers, or everyone (null). */
export type WaitlistFilter = 'write' | 'read' | null;

/** Why a call didn't work, in words the page can explain. */
export type WaitlistFailure = 'not_allowed' | 'refused' | 'unreachable';

/** The error a refused call throws. */
export class WaitlistError extends Error {
  constructor(public readonly failure: WaitlistFailure) {
    super(`Waiting list call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param code - Postgres's error code
 * @returns not_allowed (42501), refused (23514) or unreachable
 */
function failureFromCode(code: string | undefined): WaitlistFailure {
  if (code === '42501') return 'not_allowed';
  if (code === '23514') return 'refused';
  return 'unreachable';
}

/** The answers' shapes, as the functions return them. */
const interestSchema = z.enum(['write', 'read', 'both']);
const myWaitlistSchema = z.union([
  z.object({ on_list: z.literal(false) }),
  z.object({
    on_list: z.literal(true),
    waiting: z.boolean(),
    interest: interestSchema,
    joined_at: z.string(),
    admitted_at: z.string().nullable(),
  }),
]);
const staffWaitlistSchema = z.object({
  counts: z.object({
    waiting: z.number(),
    write: z.number(),
    read: z.number(),
    both: z.number(),
    admitted: z.number(),
  }),
  countries: z.array(z.object({ country: z.string(), waiting: z.number() })),
  matching: z.number(),
  people: z.array(
    z.object({
      entry_id: z.string(),
      handle: z.string().nullable(),
      display_name: z.string().nullable(),
      interest: interestSchema,
      country: z.string().nullable(),
      joined_at: z.string(),
      email_confirmed: z.boolean(),
    }),
  ),
});

/** The caller's place: not on the list, or on it (waiting or let in). */
export type MyWaitlist = z.infer<typeof myWaitlistSchema>;

/** Staff › Waitlist's answer: counts, countries and one page of people. */
export type StaffWaitlist = z.infer<typeof staffWaitlistSchema>;

/** One person waiting, as the staff list shows them. */
export type WaitingPerson = StaffWaitlist['people'][number];

/**
 * Reads the caller's place on the list.
 *
 * @param client - the shared Supabase client
 * @returns the place
 * Errors: throws WaitlistError when the call fails or the answer has an unknown shape.
 */
export async function fetchMyWaitlist(client: AppSupabaseClient): Promise<MyWaitlist> {
  const { data, error } = await client.rpc('my_waitlist');
  if (error !== null) throw new WaitlistError(failureFromCode(error.code));
  const parsed = myWaitlistSchema.safeParse(data);
  if (!parsed.success) throw new WaitlistError('unreachable');
  return parsed.data;
}

/**
 * Changes the caller's "write, read or both" answer while they wait.
 *
 * @param client - the shared Supabase client
 * @param wanted - the new answer
 * Errors: throws WaitlistError ('refused' when the caller isn't waiting any more).
 */
export async function saveMyWaitlistInterest(
  client: AppSupabaseClient,
  wanted: WaitlistInterest,
): Promise<void> {
  const { error } = await client.rpc('set_my_waitlist_interest', { wanted });
  if (error !== null) throw new WaitlistError(failureFromCode(error.code));
}

/** What the staff list asks for. */
export interface StaffWaitlistQuery {
  interest: WaitlistFilter;
  /** Two letters, or null for every country. */
  country: string | null;
  pageSize: number;
  pageOffset: number;
}

/**
 * Reads the people waiting, with the counts (owner and admin only).
 *
 * @param client - the shared Supabase client
 * @param query - the filters and the page
 * @returns the counts, the countries and one page of people
 * Errors: throws WaitlistError ('not_allowed' for anyone but owner and admin).
 */
export async function fetchStaffWaitlist(
  client: AppSupabaseClient,
  query: StaffWaitlistQuery,
): Promise<StaffWaitlist> {
  const { data, error } = await client.rpc('admin_waitlist', {
    wanted_interest: query.interest ?? undefined,
    wanted_country: query.country ?? undefined,
    page_size: query.pageSize,
    page_offset: query.pageOffset,
  });
  if (error !== null) throw new WaitlistError(failureFromCode(error.code));
  const parsed = staffWaitlistSchema.safeParse(data);
  if (!parsed.success) throw new WaitlistError('unreachable');
  return parsed.data;
}

/**
 * Lets the ticked people in; each gets the "You're in" email.
 *
 * @param client - the shared Supabase client
 * @param entryIds - the ticked entries (1 to 100)
 * @returns how many were let in
 * Errors: throws WaitlistError.
 */
export async function admitFromWaitlist(
  client: AppSupabaseClient,
  entryIds: string[],
): Promise<number> {
  const { data, error } = await client.rpc('admin_admit_from_waitlist', { entry_ids: entryIds });
  if (error !== null) throw new WaitlistError(failureFromCode(error.code));
  return data;
}

/** A wave: who and how many. */
export interface WaitlistWave {
  interest: WaitlistFilter;
  country: string | null;
  howMany: number;
}

/**
 * Lets the next confirmed people in, oldest first, by interest and country.
 *
 * @param client - the shared Supabase client
 * @param wave - the filters and the size (1 to 1,000)
 * @returns how many were let in
 * Errors: throws WaitlistError ('refused' for a size outside 1 to 1,000).
 */
export async function admitWaitlistWave(
  client: AppSupabaseClient,
  wave: WaitlistWave,
): Promise<number> {
  const { data, error } = await client.rpc('admin_admit_waitlist_wave', {
    wanted_interest: wave.interest ?? '',
    wanted_country: wave.country ?? '',
    how_many: wave.howMany,
  });
  if (error !== null) throw new WaitlistError(failureFromCode(error.code));
  return data;
}
