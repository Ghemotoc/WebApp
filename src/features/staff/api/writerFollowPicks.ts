/**
 * Reads and saves "To follow this week", the writers the Read page's Writers box shows first
 * (user story 1.4, board A04), for Stories › Featured.
 *
 * Who calls it: hooks/useWriterFollowPicks.ts.
 * What it calls next: admin_writer_follow_picks() and admin_set_writer_follow_picks() in
 * …_books_a04_writers_to_follow.sql. Both check the Featured area (owner and admin) and the
 * staff session; the save checks every writer may be suggested and writes the audit log.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** One current pick as the staff screen shows it. */
export interface WriterFollowPick {
  handle: string;
  /** The pen name, or the username when there is none. */
  displayName: string;
  /** False when the writer can't be suggested today (readers then don't see them). */
  mayShow: boolean;
}

/**
 * Why a save failed, matched to a sentence in the staff locale file.
 * - not_allowed: the database refused the person (not owner or admin);
 * - reason_missing, too_many, unknown_writer, duplicate, may_not_show: the save's checks;
 * - unreachable: anything else, such as no connection.
 */
export type WriterFollowFailure =
  | 'not_allowed'
  | 'reason_missing'
  | 'too_many'
  | 'unknown_writer'
  | 'duplicate'
  | 'may_not_show'
  | 'unreachable';

/** The error a refused call throws, carrying the reason and the database's sentence. */
export class WriterFollowError extends Error {
  constructor(
    public readonly failure: WriterFollowFailure,
    message: string,
  ) {
    super(message);
    this.name = 'WriterFollowError';
  }
}

/** The save's hints, each a failure of its own. */
const knownHints: WriterFollowFailure[] = [
  'reason_missing',
  'too_many',
  'unknown_writer',
  'duplicate',
  'may_not_show',
];

/**
 * Turns a database error into a failure the screen can name.
 *
 * @param error - Supabase's error
 * @returns the failure
 */
export function writerFollowFailureOf(error: {
  code?: string;
  hint?: string;
}): WriterFollowFailure {
  // Step 1: 42501 is the database refusing the person.
  if (error.code === '42501') return 'not_allowed';
  // Step 2: a check of the save, named by its hint.
  const hint = knownHints.find((known) => known === error.hint);
  if (error.code === '23514' && hint !== undefined) return hint;
  return 'unreachable';
}

/** One pick as admin_writer_follow_picks() writes it. */
interface WriterFollowPickRow {
  handle: string;
  display_name: string;
  may_show: boolean;
}

/**
 * Reads the current picks, in order.
 *
 * @param client - the signed-in staff member's client
 * @returns the picks; an empty list means readers see the automatic list
 * Errors: throws WriterFollowError (not_allowed for anyone but the owner and admins).
 */
export async function fetchWriterFollowPicks(
  client: AppSupabaseClient,
): Promise<WriterFollowPick[]> {
  const { data, error } = await client.rpc('admin_writer_follow_picks');
  if (error !== null) throw new WriterFollowError(writerFollowFailureOf(error), error.message);
  const rows = (data ?? []) as unknown as WriterFollowPickRow[];
  return rows.map((row) => ({
    handle: row.handle,
    displayName: row.display_name,
    mayShow: row.may_show,
  }));
}

/**
 * Replaces the picks with these usernames, in order.
 *
 * @param client - the signed-in staff member's client
 * @param handles - 0 to 3 usernames ("@" is fine); none means the automatic list
 * @param reason - why, for the audit log
 * Errors: throws WriterFollowError with the check that failed (the screen says it in the staff
 *   member's language; the database's English sentence stays in the error's message).
 */
export async function saveWriterFollowPicks(
  client: AppSupabaseClient,
  handles: string[],
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_set_writer_follow_picks', { handles, reason });
  if (error !== null) throw new WriterFollowError(writerFollowFailureOf(error), error.message);
}

/**
 * Splits what staff typed into usernames: commas, spaces or new lines between them, the "@"
 * optional.
 *
 * @param typed - the field's text
 * @returns the usernames in order, without empty ones
 */
export function handlesFromText(typed: string): string[] {
  return typed
    .split(/[\s,]+/)
    .map((part) => part.replace(/^@+/, '').trim())
    .filter((part) => part !== '');
}
