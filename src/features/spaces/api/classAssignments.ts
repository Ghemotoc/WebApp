/**
 * A class space's open assignments (bundle MUST-1, part d; IDEA-20261108-8).
 *
 * Who calls it: hooks/useClassAssignments.ts. What it calls next: class_space_assignments() in
 * supabase/migrations/…_must1d_assignment_due_dates.sql (a due moment since
 * …_calm7d2_assignment_due_time.sql), which answers only for someone who may
 * read the space, soonest first.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One open assignment: a thread with a due moment. */
export interface ClassAssignment {
  number: number;
  forumSlug: string;
  title: string;
  /** The due moment (ISO). */
  dueAt: string;
  /** The reader has a live post in the thread. */
  hasReplied: boolean;
}

/**
 * Reads one assignment from the database's answer.
 *
 * @param entry - one element of the array
 * @returns the assignment, or null when the row isn't one
 */
function assignmentFrom(entry: Json): ClassAssignment | null {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return null;
  if (typeof entry['due_at'] !== 'string') return null;
  return {
    number: Number(entry['number']),
    forumSlug: String(entry['forum_slug']),
    title: String(entry['title']),
    dueAt: entry['due_at'],
    hasReplied: entry['has_replied'] === true,
  };
}

/**
 * Lists the open assignments of a class space.
 *
 * @param client - the Supabase client
 * @param slug - the class space's address
 * @returns the assignments not yet due, soonest first; empty when there are none or the
 *   reader may not read the space
 * @throws the database error when the call fails
 */
export async function fetchClassAssignments(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassAssignment[]> {
  const { data, error } = await client.rpc('class_space_assignments', { slug });
  if (error) throw error;
  const rows = Array.isArray(data) ? data : [];
  const assignments: ClassAssignment[] = [];
  for (const row of rows) {
    const assignment = assignmentFrom(row);
    if (assignment !== null) assignments.push(assignment);
  }
  return assignments;
}
