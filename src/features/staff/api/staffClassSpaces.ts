/**
 * Staff › Schools › Class spaces: every class, setting one up for a pilot school with a named
 * teacher, and correcting its school (bundle CLASSES, part d; story S1-E8-11 criterion 10, the
 * manual pilot mode).
 *
 * Who calls it: hooks/useStaffClassSpaces.ts. What it calls next: admin_class_spaces(),
 * admin_create_class_space() and admin_set_class_school() in
 * supabase/migrations/…_classes_d_pilot_setup.sql. Each checks Schools access in a staff session
 * and writes the audit log; this file only reads the answers. The class's code and archiving use
 * the teacher's own calls (make_class_invite(), archive_class_space()), which staff may use too.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** One class on the staff page. Never a user ID or a student's name. */
export interface StaffClassSpace {
  slug: string;
  name: string;
  schoolName: string | null;
  teacherHandle: string;
  teacherName: string;
  memberCount: number;
  locksAt: string | null;
  isLocked: boolean;
  archivedAt: string | null;
}

/** What staff type to set up a class. */
export interface NewStaffClassSpace {
  teacherHandle: string;
  name: string;
  schoolName: string;
  description: string;
}

/** Why a call failed. */
export type StaffClassFailure =
  | 'not_allowed'
  | 'not_a_teacher'
  | 'school_needed'
  | 'school_length'
  | 'name_taken'
  | 'text'
  | 'missing'
  | 'unreachable';

/** The error a refused call throws. */
export class StaffClassError extends Error {
  constructor(readonly failure: StaffClassFailure) {
    super(`The class space call was refused: ${failure}`);
    this.name = 'StaffClassError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, StaffClassFailure> = {
  not_allowed: 'not_allowed',
  not_a_teacher: 'not_a_teacher',
  'school:needed': 'school_needed',
  'school:length': 'school_length',
  'name:taken': 'name_taken',
  'space:missing': 'missing',
};

/**
 * Turns a database error into a StaffClassError.
 *
 * @param error - Postgres's hint and code
 * @returns the failure: by hint, a name or description problem as "text", otherwise unreachable
 */
export function staffClassErrorFrom(error: {
  hint?: string | null;
  code?: string;
}): StaffClassError {
  const hint = error.hint ?? '';
  const byHint = failureForHint[hint];
  if (byHint !== undefined) return new StaffClassError(byHint);
  // The space text checks answer "name:…" or "description:…" (empty, too long and so on).
  if (hint.startsWith('name:') || hint.startsWith('description:'))
    return new StaffClassError('text');
  if (error.code === '42501') return new StaffClassError('not_allowed');
  return new StaffClassError('unreachable');
}

/**
 * An object from the answer, or an empty one when it is anything else.
 *
 * @param value - one value of the answer
 * @returns the object
 */
function objectOf(value: Json | undefined): Record<string, Json | undefined> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * A text value, or null when the database sent anything else.
 *
 * @param value - one field of the answer
 * @returns the text, or null
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Reads one class from admin_class_spaces().
 *
 * @param value - one element of the answer
 * @returns the class
 */
export function staffClassSpaceFrom(value: Json): StaffClassSpace {
  const row = objectOf(value);
  const teacher = objectOf(row['teacher']);
  const teacherHandle = String(teacher['handle'] ?? '');
  return {
    slug: String(row['slug']),
    name: String(row['name']),
    schoolName: textOrNull(row['school_name']),
    teacherHandle,
    teacherName: textOrNull(teacher['display_name']) ?? teacherHandle,
    memberCount: Number(row['member_count'] ?? 0),
    locksAt: textOrNull(row['locks_at']),
    isLocked: row['is_locked'] === true,
    archivedAt: textOrNull(row['archived_at']),
  };
}

/**
 * Every class space, newest first.
 *
 * @param client - the Supabase client
 * @returns the classes
 * @throws StaffClassError when refused (not_allowed) or unreachable
 */
export async function listStaffClassSpaces(client: AppSupabaseClient): Promise<StaffClassSpace[]> {
  const { data, error } = await client.rpc('admin_class_spaces');
  if (error) throw staffClassErrorFrom(error);
  return Array.isArray(data) ? data.map(staffClassSpaceFrom) : [];
}

/**
 * Sets up a class for a pilot school, owned by the named teacher.
 *
 * @param client - the Supabase client
 * @param request - the teacher's username, the class's name, the school and the description
 * @returns the new class's address
 * @throws StaffClassError when refused
 */
export async function createStaffClassSpace(
  client: AppSupabaseClient,
  request: NewStaffClassSpace,
): Promise<string> {
  const { data, error } = await client.rpc('admin_create_class_space', {
    teacher_handle: request.teacherHandle.trim().replace(/^@/, ''),
    name: request.name,
    school_name: request.schoolName,
    description: request.description,
  });
  if (error) throw staffClassErrorFrom(error);
  return String(objectOf(data)['slug']);
}

/**
 * Writes or corrects the school a class belongs to.
 *
 * @param client - the Supabase client
 * @param request - the class's address and the school's name
 * @returns the school's name as saved
 * @throws StaffClassError when refused
 */
export async function setStaffClassSchool(
  client: AppSupabaseClient,
  request: { slug: string; schoolName: string },
): Promise<string> {
  const { data, error } = await client.rpc('admin_set_class_school', {
    slug: request.slug,
    school_name: request.schoolName,
  });
  if (error) throw staffClassErrorFrom(error);
  return String(objectOf(data)['school_name']);
}
