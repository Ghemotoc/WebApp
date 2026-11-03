/**
 * The contest entries store for staff: one contest's entries and disqualifying one (story
 * S1-E11-15 criteria 5 and 6; bundle CONTESTS-13b2a).
 *
 * Who calls it: hooks/useContestEntries.ts, for the Entries section of a contest's editor.
 * What it calls next: admin_contest_entries() and admin_disqualify_contest_entry() in
 * …_contests_b2a_entries_disqualify.sql, which check the owner or admin role, issue the statement
 * of reasons and write the audit log. A refused call becomes a ContestError with the database's
 * hint (reason_needed, not_valid, not_allowed), as in api/contests.ts.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { staffContestEntriesSchema, type StaffContestEntry } from '@/schemas/contests';

import { contestErrorFrom } from './contests';

/**
 * Reads one contest's entries, by pen name and age group only.
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * @returns the entries, newest first
 * Errors: a ContestError when the call fails; a ZodError when the answer has the wrong shape.
 */
export async function fetchContestEntries(
  client: AppSupabaseClient,
  contestId: string,
): Promise<StaffContestEntry[]> {
  const { data, error } = await client.rpc('admin_contest_entries', {
    target_contest_id: contestId,
  });
  if (error !== null) throw contestErrorFrom(error);
  return staffContestEntriesSchema.parse(data);
}

/**
 * Disqualifies an entry; the writer gets a statement of reasons they can appeal.
 *
 * @param client - the signed-in admin's client
 * @param entryId - the entry
 * @param reason - the facts, in words the writer will read
 * @returns the statement's reference, for example S-000123
 * Errors: a ContestError (reason_needed, not_valid, no_entry, not_allowed).
 */
export async function disqualifyContestEntry(
  client: AppSupabaseClient,
  entryId: string,
  reason: string,
): Promise<string> {
  const { data, error } = await client.rpc('admin_disqualify_contest_entry', {
    target_entry_id: entryId,
    reason,
  });
  if (error !== null) throw contestErrorFrom(error);
  return data;
}
