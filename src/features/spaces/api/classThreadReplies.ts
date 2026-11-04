/**
 * "Who has replied" for a class thread (bundle 14d IDEAS-3, part b; idea IDEA-20261102-5).
 *
 * Who calls it: hooks/useClassThreadReplies.ts. What it calls next: class_thread_replies() in
 * supabase/migrations/…_ideas3_b_who_has_replied.sql. The database decides who may see the lists
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

/** The class split by whether each member has posted in the thread. */
export interface ClassThreadReplies {
  replied: ClassMemberName[];
  notYet: ClassMemberName[];
}

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
  return { replied: membersFrom(data['replied']), notYet: membersFrom(data['not_yet']) };
}
