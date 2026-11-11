/**
 * The database calls of Archived stories (bundle ARCHIVE-1; Robert, 11 Nov 2026).
 *
 * Who calls it: hooks/useStoryArchive.ts (Settings › Archived stories).
 * What it calls next: my_story_archive() and claim_story_archive()
 * (supabase/migrations/…_archive1_story_archive.sql). The archive table itself is never read
 * from the browser: nobody may read it.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** Whether archived stories wait for the signed-in person's email address. */
export type StoryArchiveState =
  | { waiting: false }
  // keptUntil: the day the archive is deleted; locked: too many wrong tries today.
  | { waiting: true; keptUntil: string; locked: boolean };

/** What the person enters: the closed account's year of birth and one of its names. */
export interface ArchiveClaim {
  birthYear: number;
  knownName: string;
}

/** What claim_story_archive() answered. */
export type ArchiveClaimOutcome =
  | { outcome: 'restored'; restored: number; notRestored: number }
  // The details matched, but no story could be written back.
  | { outcome: 'not_restored'; notRestored: number }
  | { outcome: 'no_match'; triesLeft: number }
  | { outcome: 'locked' }
  | { outcome: 'not_allowed' }
  | { outcome: 'unavailable' };

/** The two answers, as the database writes them. */
interface ArchiveStateReply {
  waiting?: boolean;
  kept_until?: string;
  locked?: boolean;
}
interface ArchiveClaimReply {
  outcome?: string;
  restored?: number;
  not_restored?: number;
  tries_left?: number;
}

/**
 * Asks whether archived stories wait for the signed-in person's confirmed email address.
 *
 * @param client - the shared Supabase client
 * @returns waiting or not; never which stories or how many
 * Errors: throws when the database can't be reached or the person is signed out.
 */
export async function fetchMyStoryArchive(client: AppSupabaseClient): Promise<StoryArchiveState> {
  const { data, error } = await client.rpc('my_story_archive');
  if (error !== null) throw new Error(`Could not check the story archive: ${error.message}`);
  const reply = data as ArchiveStateReply;
  if (reply.waiting !== true || reply.kept_until === undefined) return { waiting: false };
  return { waiting: true, keptUntil: reply.kept_until, locked: reply.locked === true };
}

/**
 * Turns the database's answer into the outcome the screen shows.
 *
 * @param reply - claim_story_archive()'s answer
 * @returns the outcome; an answer this code doesn't know reads as "unavailable"
 */
function outcomeOfReply(reply: ArchiveClaimReply): ArchiveClaimOutcome {
  const notRestored = reply.not_restored ?? 0;
  switch (reply.outcome) {
    case 'restored':
      return { outcome: 'restored', restored: reply.restored ?? 0, notRestored };
    case 'not_restored':
      return { outcome: 'not_restored', notRestored };
    case 'no_match':
      return { outcome: 'no_match', triesLeft: reply.tries_left ?? 0 };
    case 'locked':
      return { outcome: 'locked' };
    case 'not_allowed':
      return { outcome: 'not_allowed' };
    default:
      return { outcome: 'unavailable' };
  }
}

/**
 * Asks to bring the archived stories back into the signed-in person's account.
 *
 * @param client - the shared Supabase client
 * @param claim - the closed account's year of birth and one of its names
 * @returns what happened: restored, no match, locked and so on
 * Errors: throws when the database can't be reached.
 */
export async function claimStoryArchive(
  client: AppSupabaseClient,
  claim: ArchiveClaim,
): Promise<ArchiveClaimOutcome> {
  const { data, error } = await client.rpc('claim_story_archive', {
    birth_year: claim.birthYear,
    known_name: claim.knownName,
  });
  if (error !== null) throw new Error(`Could not bring the stories back: ${error.message}`);
  return outcomeOfReply(data as ArchiveClaimReply);
}
