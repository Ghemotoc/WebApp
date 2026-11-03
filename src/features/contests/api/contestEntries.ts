/**
 * The contest entries store for staff: one contest's entries, disqualifying one (story S1-E11-15
 * criteria 5 and 6; bundle CONTESTS-13b2a), choosing winners and finalists, publishing the
 * results and marking prizes as sent (criteria 7, 8 and 10; part 13b2b).
 *
 * Who calls it: hooks/useContestEntries.ts, for the Entries section of a contest's editor.
 * What it calls next: admin_contest_entries() and admin_disqualify_contest_entry() in
 * …_contests_b2a_entries_disqualify.sql, and admin_set_contest_placing(),
 * admin_publish_contest_results() and admin_mark_contest_prize_sent() in
 * …_contests_b2b_results.sql. They check the owner or admin role, issue the statement
 * of reasons and write the audit log. A refused call becomes a ContestError with the database's
 * hint (reason_needed, not_valid, not_allowed), as in api/contests.ts.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  staffContestEntriesSchema,
  type ContestPlacing,
  type StaffContestEntry,
} from '@/schemas/contests';

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

/**
 * Marks an entry as winner, finalist or neither, once entries have closed (part 13b2b).
 *
 * @param client - the signed-in admin's client
 * @param entryId - the entry
 * @param placing - winner, finalist or null for none
 * Errors: a ContestError (entries_open, not_valid, bad_placing, not_allowed).
 */
export async function setContestPlacing(
  client: AppSupabaseClient,
  entryId: string,
  placing: ContestPlacing | null,
): Promise<void> {
  const { error } = await client.rpc('admin_set_contest_placing', {
    target_entry_id: entryId,
    // The generated type says string; null means "no placing" to the database.
    wanted_placing: placing as string,
  });
  if (error !== null) throw contestErrorFrom(error);
}

/**
 * Publishes a closed contest's winners and finalists on its landing page (part 13b2b).
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * Errors: a ContestError (no_winner, entries_open, already_published, not_allowed).
 */
export async function publishContestResults(
  client: AppSupabaseClient,
  contestId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_publish_contest_results', {
    target_contest_id: contestId,
  });
  if (error !== null) throw contestErrorFrom(error);
}

/**
 * Records that a winner's prize was sent; the delivery details are never stored (part 13b2b).
 *
 * @param client - the signed-in admin's client
 * @param entryId - the winning entry
 * @param parentConsentOnFile - staff confirm a parent's or guardian's consent is on file (needed
 *   for a winner under 16)
 * Errors: a ContestError (parent_consent_needed, not_a_winner, not_published, already_sent).
 */
export async function markContestPrizeSent(
  client: AppSupabaseClient,
  entryId: string,
  parentConsentOnFile: boolean,
): Promise<void> {
  const { error } = await client.rpc('admin_mark_contest_prize_sent', {
    target_entry_id: entryId,
    parent_consent_on_file: parentConsentOnFile,
  });
  if (error !== null) throw contestErrorFrom(error);
}

/**
 * Issues a certificate to every valid entry once the results are published: winners and
 * finalists by their placing, the rest as participants (part 13b2c; S1-E11-15 criterion 9).
 * Running it again changes only certificates whose placing changed.
 *
 * @param client - the signed-in admin's client
 * @param contestId - the contest
 * @returns how many certificates were made or changed
 * Errors: a ContestError (not_published, no_contest, not_allowed).
 */
export async function issueContestCertificates(
  client: AppSupabaseClient,
  contestId: string,
): Promise<number> {
  const { data, error } = await client.rpc('admin_issue_contest_certificates', {
    target_contest_id: contestId,
  });
  if (error !== null) throw contestErrorFrom(error);
  // The answer is { issued }; anything else counts as none.
  const answer = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const issued = answer['issued'];
  return typeof issued === 'number' ? issued : 0;
}
