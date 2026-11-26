/**
 * The teacher's tools for a class space: starting one, its lock at the end of the school year,
 * the members still waiting to read (bundle CLASSES, part b; story S1-E8-11) and archiving
 * (part d).
 *
 * Who calls it: hooks/useClassTools.ts. What it calls next: create_class_space(),
 * set_class_lock(), class_waiting_members() and archive_class_space() in
 * supabase/migrations/…_classes_a_class_spaces.sql, …_classes_b_class_tools.sql and
 * …_classes_d_pilot_setup.sql. The database checks every rule (who holds which power, the
 * lock date); this file only reads its answers and turns refusals into ClassToolError.
 */
import type { DateTimeValue } from '@/components/ui/DateTimeField';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import { localFieldsFor, localTimeToInstant } from '@/lib/local-time';
import { dateLocaleFor } from '@/lib/romania-time';

import { spaceErrorFrom, type SpaceSettings } from './spaces';

/** Why a member of the class can't read yet, in the words the teacher's list uses. */
export type WaitingReason = 'age_check' | 'parental_consent' | 'account';

/** One member who joined but can't read or post yet. Never their age or user ID. */
export interface WaitingMember {
  handle: string;
  displayName: string;
  reason: WaitingReason;
}

/** The lock after a change. */
export interface ClassLock {
  locksAt: string | null;
  isLocked: boolean;
}

/** Why the database refused a tool. */
export type ClassToolFailure = 'not_allowed' | 'missing' | 'lock_date' | 'archived' | 'unreachable';

/** The error a refused call throws. */
export class ClassToolError extends Error {
  constructor(readonly failure: ClassToolFailure) {
    super(`The class tool call was refused: ${failure}`);
    this.name = 'ClassToolError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, ClassToolFailure> = {
  'space:not_allowed': 'not_allowed',
  'space:missing': 'missing',
  'space:not_class': 'missing',
  'lock:date': 'lock_date',
  'space:archived': 'archived',
};

/**
 * Turns a database error into a ClassToolError.
 *
 * @param error - Postgres's hint
 * @returns the failure by hint, otherwise unreachable
 */
export function classToolErrorFrom(error: { hint?: string | null }): ClassToolError {
  return new ClassToolError(failureForHint[error.hint ?? ''] ?? 'unreachable');
}

/**
 * Starts a class space for a teacher with the badge (criterion 1). The class reads and posts for
 * members only, so only the name, words and banner are sent.
 *
 * @param client - the Supabase client
 * @param settings - the form's settings (posting, joining and readers are ignored)
 * @returns the new space's address
 * @throws SpaceError when refused (not_teacher, a name problem, too many)
 */
export async function createClassSpace(
  client: AppSupabaseClient,
  settings: SpaceSettings,
): Promise<string> {
  const { data, error } = await client.rpc('create_class_space', {
    name: settings.name,
    description: settings.description,
    rules: settings.rules,
    banner: settings.banner,
  });
  if (error) throw spaceErrorFrom(error);
  const row = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return String(row['slug']);
}

/**
 * Sets when the class locks, locks it now (a time in the past) or unlocks it (null).
 *
 * @param client - the Supabase client
 * @param request - the space's address and the new lock time
 * @returns the lock after the change
 * @throws ClassToolError when refused
 */
export async function setClassLock(
  client: AppSupabaseClient,
  request: { slug: string; locksAt: string | null },
): Promise<ClassLock> {
  // Leaving the time out unlocks the class (the function's default, no date).
  const args =
    request.locksAt === null
      ? { slug: request.slug }
      : { slug: request.slug, new_locks_at: request.locksAt };
  const { data, error } = await client.rpc('set_class_lock', args);
  if (error) throw classToolErrorFrom(error);
  const row = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return {
    locksAt: typeof row['locks_at'] === 'string' ? row['locks_at'] : null,
    isLocked: row['is_locked'] === true,
  };
}

/**
 * Reads one waiting member from the database's answer.
 *
 * @param value - one element of class_waiting_members()
 * @returns the member, with an unknown reason read as "account"
 */
function waitingMemberFrom(value: Json): WaitingMember {
  const row = value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const reason = row['reason'];
  return {
    handle: String(row['handle']),
    displayName: String(row['display_name'] ?? row['handle']),
    reason: reason === 'age_check' || reason === 'parental_consent' ? reason : 'account',
  };
}

/**
 * Archives a class for good (CLASSES-d; S1-E8-11 criterion 8): it locks now if it hasn't yet,
 * nobody unlocks it again, and every member still reads it.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns the lock after archiving
 * @throws ClassToolError when refused (not_allowed, missing, archived)
 */
export async function archiveClassSpace(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassLock> {
  const { data, error } = await client.rpc('archive_class_space', { slug });
  if (error) throw classToolErrorFrom(error);
  const row = data !== null && typeof data === 'object' && !Array.isArray(data) ? data : {};
  return { locksAt: null, isLocked: row['is_locked'] === true };
}

/**
 * The members of a class who joined but can't read yet, and why (board ClassSpace).
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the list, oldest joiner first
 * @throws ClassToolError when refused
 */
export async function fetchClassWaitingMembers(
  client: AppSupabaseClient,
  slug: string,
): Promise<WaitingMember[]> {
  const { data, error } = await client.rpc('class_waiting_members', { slug });
  if (error) throw classToolErrorFrom(error);
  return Array.isArray(data) ? data.map(waitingMemberFrom) : [];
}

/**
 * The lock form's starting values: the saved lock moment on the viewer's own clock, or an empty
 * date with midnight when there is none (CALM-7d: the teacher picks a date and a time on their own
 * clock, as every member date field does since CALM-1c).
 *
 * @param locksAt - the lock time from the database (ISO), or null
 * @returns { date: "YYYY-MM-DD" or "", time: "HH:MM" }
 */
export function lockFieldsOf(locksAt: string | null): DateTimeValue {
  if (locksAt === null) return { date: '', time: '00:00' };
  return localFieldsFor(new Date(locksAt));
}

/**
 * The moment the lock form's date and time mean, ready for set_class_lock().
 *
 * @param fields - the typed date and time, on the viewer's own clock
 * @returns the ISO moment, or null when the date is empty or not a real date and time
 */
export function lockTimeOf(fields: DateTimeValue): string | null {
  const instant = localTimeToInstant(fields.date, fields.time);
  return instant === null ? null : instant.toISOString();
}

/** Staff screens still read lock dates on Romania's calendar until CALM-9 redraws them. */
const lockTimeZone = 'Europe/Bucharest';

/**
 * A lock moment as a member reads it, on their own clock: "1 July 2027 at 00:00" or "1 iulie 2027 la 00:00" (CALM-7d; the
 * viewer's local time, CALM-8b).
 *
 * @param locksAt - the lock time (ISO)
 * @param language - the interface language
 * @param timeZone - an IANA zone for tests; left out, the browser's own zone is used
 * @returns the long date and the time
 */
export function lockMomentText(locksAt: string, language: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    dateStyle: 'long',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(locksAt));
}

/**
 * A lock time as people read it ("1 July 2027"), on the Romanian calendar.
 *
 * @param locksAt - the lock time (ISO)
 * @param language - the interface language
 * @returns the long date
 */
export function lockDateText(locksAt: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    dateStyle: 'long',
    timeZone: lockTimeZone,
  }).format(new Date(locksAt));
}
