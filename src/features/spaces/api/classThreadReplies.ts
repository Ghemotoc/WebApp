/**
 * "Who has replied" for a class thread (bundle 14d IDEAS-3, part b; idea IDEA-20261102-5).
 *
 * Who calls it: hooks/useClassThreadReplies.ts. What it calls next: class_thread_replies() in
 * supabase/migrations/…_ideas3_b_who_has_replied.sql (with the due date and the late marks since
 * …_must1d_assignment_due_dates.sql, MUST-1d), and set_forum_thread_due_date() for the due date. The database decides who may see the lists
 * (the teacher, or someone holding the class's "members" power) and answers null for everyone
 * else; this file only reads its answer.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One member of the class, by name only. Never their age or user ID. */
export interface ClassMemberName {
  handle: string;
  displayName: string;
}

/** A member who has replied, and whether the first reply came after the due date (MUST-1d). */
export interface ClassReply extends ClassMemberName {
  isLate: boolean;
}

/** The class split by whether each member has posted in the thread. */
export interface ClassThreadReplies {
  replied: ClassReply[];
  notYet: ClassMemberName[];
  /** The assignment's due day ("2026-11-14"), or null when it has none (MUST-1d). */
  dueOn: string | null;
}

/** Why saving a due date failed, as the field explains it. */
export type DueDateFailure = 'due_in_past' | 'class_locked' | 'not_teacher' | 'unknown';

/**
 * Reads one list of members from the database's answer.
 *
 * @param value - the "replied" or "not_yet" array
 * @returns the members, with a missing display name read as the handle
 */
function membersFrom(value: Json | undefined): ClassMemberName[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const row = entry !== null && typeof entry === 'object' && !Array.isArray(entry) ? entry : {};
    const handle = String(row['handle'] ?? '');
    return { handle, displayName: String(row['display_name'] ?? handle) };
  });
}

/**
 * Asks who in the class has replied to a thread.
 *
 * @param client - the Supabase client
 * @param threadId - the thread's ID, from its heading
 * @returns the two lists, or null when the thread isn't a class thread or the caller isn't its
 *   teacher (the panel then stays hidden)
 * @throws the database error when the call itself fails, so the panel can say so
 */
export async function fetchClassThreadReplies(
  client: AppSupabaseClient,
  threadId: string,
): Promise<ClassThreadReplies | null> {
  const { data, error } = await client.rpc('class_thread_replies', {
    target_thread_id: threadId,
  });
  if (error) throw error;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  return {
    replied: repliesFrom(data['replied']),
    notYet: membersFrom(data['not_yet']),
    dueOn: typeof data['due_on'] === 'string' ? data['due_on'] : null,
  };
}

/**
 * Reads the "replied" list, with each member's late mark.
 *
 * @param value - the "replied" array
 * @returns the members who replied
 */
function repliesFrom(value: Json | undefined): ClassReply[] {
  const names = membersFrom(value);
  const rows = Array.isArray(value) ? value : [];
  return names.map((name, index) => {
    const row = rows[index];
    const isLate =
      row !== null && typeof row === 'object' && !Array.isArray(row) && row['is_late'] === true;
    return { ...name, isLate };
  });
}

/** An error from set_forum_thread_due_date(), carrying why it failed. */
export class DueDateError extends Error {
  constructor(readonly failure: DueDateFailure) {
    super(failure);
    this.name = 'DueDateError';
  }
}

/**
 * Sets or clears a class assignment's due date (the teacher only; the database checks).
 *
 * @param client - the Supabase client
 * @param threadId - the thread's ID
 * @param dueOn - the day ("2026-11-14"), or null to clear it
 * @throws DueDateError saying why it was refused
 */
export async function saveThreadDueDate(
  client: AppSupabaseClient,
  threadId: string,
  dueOn: string | null,
): Promise<void> {
  const { error } = await client.rpc('set_forum_thread_due_date', {
    target_thread_id: threadId,
    // Null clears the date; the generated type doesn't know a date argument may be null.
    due: dueOn as string,
  });
  if (error === null) return;
  const known: DueDateFailure[] = ['due_in_past', 'class_locked', 'not_teacher'];
  const hint = known.find((failure) => failure === error.hint);
  throw new DueDateError(hint ?? 'unknown');
}
