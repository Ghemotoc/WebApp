/**
 * Class points (bundle CLASS-POINTS, part 1; stories S1-E8-13, S1-E8-14 and S1-E8-16): the calls
 * a pupil and a teacher make, and the shapes the screens read.
 *
 * Who calls it: hooks/useClassPoints.ts. What it calls next: class_points_summary(),
 * set_class_points(), class_chapter_points(), give_class_points(), set_teacher_points(),
 * and class_thread_teacher_points() in
 * supabase/migrations/…_classpoints1_02_class_points.sql.
 *
 * The database decides who sees what (Robert, 13 Nov 2026): a pupil sees only the points their
 * own chapters received, the teacher sees totals, and nobody but our moderators ever sees who
 * gave points. Nothing in this file carries a giver, so no screen can show one.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a call. */
export type ClassPointsFailure =
  | 'not_offered'
  | 'not_opened'
  | 'cap'
  | 'budget'
  | 'range'
  | 'not_teacher'
  | 'note_off'
  | 'note_too_long'
  | 'note_html'
  | 'note_link'
  | 'signed_out'
  | 'not_class'
  | 'archived'
  | 'not_allowed'
  | 'unreachable';

/** The error a refused call throws. */
export class ClassPointsError extends Error {
  constructor(readonly failure: ClassPointsFailure) {
    super(`The class points call was refused: ${failure}`);
    this.name = 'ClassPointsError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, ClassPointsFailure> = {
  'points:not_offered': 'not_offered',
  'points:not_opened': 'not_opened',
  'points:cap': 'cap',
  'points:budget': 'budget',
  'points:range': 'range',
  'points:not_teacher': 'not_teacher',
  'note:off': 'note_off',
  'note:too_long': 'note_too_long',
  'note:html': 'note_html',
  'note:link': 'note_link',
  signed_out: 'signed_out',
  'space:not_class': 'not_class',
  'space:archived': 'archived',
  'space:not_allowed': 'not_allowed',
};

/**
 * Turns a database error into a ClassPointsError.
 *
 * @param error - Postgres's hint and code
 * @returns the failure by hint; "not allowed" for any other refusal by role; otherwise unreachable
 */
export function classPointsErrorFrom(error: {
  hint?: string | null;
  code?: string | null;
}): ClassPointsError {
  const byHint = failureForHint[error.hint ?? ''];
  if (byHint !== undefined) return new ClassPointsError(byHint);
  // 42501 is Postgres's "insufficient privilege": someone without the power tried.
  return new ClassPointsError(error.code === '42501' ? 'not_allowed' : 'unreachable');
}

/** A JSON object, once we know the answer is one. */
export type JsonObject = { [key: string]: Json | undefined };

/**
 * Reads an answer as an object.
 *
 * @param value - any JSON
 * @returns the object, or null for null, a list or a plain value
 */
export function objectFrom(value: Json | undefined): JsonObject | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

/**
 * Reads a whole number.
 *
 * @param value - any JSON
 * @returns the number, or 0 when it isn't one
 */
export function numberFrom(value: Json | undefined): number {
  return typeof value === 'number' ? value : 0;
}

/**
 * Reads a text.
 *
 * @param value - any JSON
 * @returns the text, or null when it isn't one or is empty
 */
function textFrom(value: Json | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** Class points on a class page, for the person looking. */
export interface ClassPointsSummary {
  isEnabled: boolean;
  role: 'teacher' | 'pupil';
  /** True for the teacher of a class that isn't archived. */
  canSwitch: boolean;
  /** How many points every pupil may give in a week, and at most to one chapter. */
  budget: number;
  cap: number;
  /** A pupil's week: what is left and the day a new budget starts. Null for a teacher. */
  week: { left: number; resetsOn: string } | null;
  /** The points the pupil's own chapters received in this class. Null for a teacher. */
  receivedTotal: number | null;
}

/**
 * Reads class_points_summary()'s answer.
 *
 * @param data - the answer
 * @returns the summary, or null for someone who is neither the teacher nor a pupil
 */
export function classPointsSummaryFrom(data: Json): ClassPointsSummary | null {
  const row = objectFrom(data);
  if (row === null) return null;
  const isPupil = row['role'] !== 'teacher';
  return {
    isEnabled: row['enabled'] === true,
    role: isPupil ? 'pupil' : 'teacher',
    canSwitch: row['can_switch'] === true,
    budget: numberFrom(row['budget']),
    cap: numberFrom(row['cap']),
    week: isPupil ? { left: numberFrom(row['left']), resetsOn: String(row['resets_on']) } : null,
    receivedTotal: isPupil ? numberFrom(row['received_total']) : null,
  };
}

/** A teacher's points on one piece of work. */
export interface TeacherPoints {
  /** The row's ID, which the Report button sends for the note. */
  id: string;
  points: number;
  /** The private note, or null when there is none or it may not show. */
  note: string | null;
}

/**
 * Reads {id, points, note}.
 *
 * @param value - the object, or null
 * @returns the teacher's points, or null when the work has none
 */
export function teacherPointsFrom(value: Json | undefined): TeacherPoints | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return { id: String(row['id']), points: numberFrom(row['points']), note: textFrom(row['note']) };
}

/** What a classmate may do on a chapter this week. */
export interface ChapterGiving {
  budget: number;
  left: number;
  cap: number;
  /** The points this pupil already gave this chapter this week. */
  given: number;
  note: string | null;
  /** The longest note, in characters. */
  noteMax: number;
  resetsOn: string;
  canGive: boolean;
}

/** A classmate's note on the writer's chapter: the words, never the giver. */
export interface ReceivedNote {
  /** The gift's ID, which the Report button sends. */
  id: string;
  note: string;
}

/** Class points on one chapter, with only the parts the viewer may see. */
export interface ChapterClassPoints {
  className: string;
  classSlug: string;
  role: 'classmate' | 'writer' | 'teacher';
  isLocked: boolean;
  /** For a classmate only. */
  giving: ChapterGiving | null;
  /** The total for the writer and the teacher; the notes for the writer only. */
  received: { total: number; notes: ReceivedNote[] } | null;
  /** The teacher's points, for the writer and the teacher. */
  teacher: TeacherPoints | null;
  /** For the teacher: the most points they may give, whether notes are on and the longest note. */
  teacherMax: number;
  areNotesOn: boolean;
  teacherNoteMax: number;
}

/**
 * Reads the "giving" part.
 *
 * @param value - the object, or null
 * @returns what the classmate may give, or null for the writer and the teacher
 */
function givingFrom(value: Json | undefined): ChapterGiving | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return {
    budget: numberFrom(row['budget']),
    left: numberFrom(row['left']),
    cap: numberFrom(row['cap']),
    given: numberFrom(row['given']),
    note: textFrom(row['note']),
    noteMax: numberFrom(row['note_max']),
    resetsOn: String(row['resets_on']),
    canGive: row['can_give'] === true,
  };
}

/**
 * Reads the "received" part.
 *
 * @param value - the object, or null
 * @returns the total and the notes, or null for a classmate
 */
function receivedFrom(value: Json | undefined): ChapterClassPoints['received'] {
  const row = objectFrom(value);
  if (row === null) return null;
  const notes: ReceivedNote[] = [];
  for (const entry of Array.isArray(row['notes']) ? row['notes'] : []) {
    const note = objectFrom(entry);
    const words = textFrom(note?.['note']);
    if (note !== null && words !== null) notes.push({ id: String(note['id']), note: words });
  }
  return { total: numberFrom(row['total']), notes };
}

/**
 * Reads class_chapter_points()'s or give_class_points()'s answer.
 *
 * @param data - the answer
 * @returns the chapter's class points, or null when there are none for this viewer
 */
export function chapterClassPointsFrom(data: Json): ChapterClassPoints | null {
  const row = objectFrom(data);
  const classRow = objectFrom(row?.['class']);
  if (row === null || classRow === null) return null;
  const role = row['role'];
  if (role !== 'classmate' && role !== 'writer' && role !== 'teacher') return null;
  return {
    className: String(classRow['name']),
    classSlug: String(classRow['slug']),
    role,
    isLocked: row['is_locked'] === true,
    giving: givingFrom(row['giving']),
    received: receivedFrom(row['received']),
    teacher: teacherPointsFrom(row['teacher']),
    teacherMax: numberFrom(row['teacher_max']),
    areNotesOn: row['notes_on'] === true,
    teacherNoteMax: numberFrom(row['note_max']),
  };
}

/** The teacher points on a class thread's replies. */
export interface ThreadTeacherPoints {
  isTeacher: boolean;
  teacherMax: number;
  areNotesOn: boolean;
  /** The longest private note, in characters. */
  noteMax: number;
  isLocked: boolean;
  /** The marked replies by the reply's ID: all for the teacher, their own for a pupil. */
  byPostId: Record<string, TeacherPoints>;
}

/**
 * Reads class_thread_teacher_points()'s answer.
 *
 * @param data - the answer
 * @returns the thread's teacher points, or null outside a class with points on
 */
export function threadTeacherPointsFrom(data: Json): ThreadTeacherPoints | null {
  const row = objectFrom(data);
  if (row === null) return null;
  const byPostId: Record<string, TeacherPoints> = {};
  for (const entry of Array.isArray(row['replies']) ? row['replies'] : []) {
    const points = teacherPointsFrom(entry);
    const postId = textFrom(objectFrom(entry)?.['post_id']);
    if (points !== null && postId !== null) byPostId[postId] = points;
  }
  return {
    isTeacher: row['is_teacher'] === true,
    teacherMax: numberFrom(row['teacher_max']),
    areNotesOn: row['notes_on'] === true,
    noteMax: numberFrom(row['note_max']),
    isLocked: row['is_locked'] === true,
    byPostId,
  };
}

/**
 * Class points on a class page.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns the summary, or null for someone who is neither the teacher nor a pupil
 * @throws ClassPointsError when the database can't be reached
 */
export async function fetchClassPointsSummary(
  client: AppSupabaseClient,
  slug: string,
): Promise<ClassPointsSummary | null> {
  const { data, error } = await client.rpc('class_points_summary', { slug });
  if (error) throw classPointsErrorFrom(error);
  return classPointsSummaryFrom(data);
}

/**
 * The teacher turns class points on or off.
 *
 * @param client - the Supabase client
 * @param request - the class and the new state
 * @returns the summary after the change
 * @throws ClassPointsError when refused (not_class, archived, not_allowed)
 */
export async function setClassPoints(
  client: AppSupabaseClient,
  request: { slug: string; isOn: boolean },
): Promise<ClassPointsSummary | null> {
  const { data, error } = await client.rpc('set_class_points', {
    slug: request.slug,
    turn_on: request.isOn,
  });
  if (error) throw classPointsErrorFrom(error);
  return classPointsSummaryFrom(data);
}

/**
 * Class points on one chapter. For a classmate this also records that they opened the chapter,
 * which giving points asks for (S1-E8-13 criterion 4).
 *
 * @param client - the Supabase client
 * @param chapterId - the chapter's row ID
 * @returns the chapter's class points, or null when there are none for this viewer
 * @throws ClassPointsError when the database can't be reached
 */
export async function fetchChapterClassPoints(
  client: AppSupabaseClient,
  chapterId: string,
): Promise<ChapterClassPoints | null> {
  const { data, error } = await client.rpc('class_chapter_points', {
    target_chapter_id: chapterId,
  });
  if (error) throw classPointsErrorFrom(error);
  return chapterClassPointsFrom(data);
}

/** What a pupil gives: 0 takes the points back. */
export interface GiveRequest {
  chapterId: string;
  points: number;
  note: string;
}

/**
 * A pupil gives this week's points to a classmate's chapter, changes them or takes them back.
 *
 * @param client - the Supabase client
 * @param request - the chapter, the points and the optional line
 * @returns the chapter's class points after the change
 * @throws ClassPointsError when refused (not_offered, not_opened, cap, budget, note_*)
 */
export async function giveClassPoints(
  client: AppSupabaseClient,
  request: GiveRequest,
): Promise<ChapterClassPoints | null> {
  const { data, error } = await client.rpc('give_class_points', {
    target_chapter_id: request.chapterId,
    new_points: request.points,
    new_note: request.note,
  });
  if (error) throw classPointsErrorFrom(error);
  return chapterClassPointsFrom(data);
}

/** What the teacher saves: points null takes them away. */
export interface TeacherPointsRequest {
  kind: 'chapter' | 'reply';
  /** The chapter's or the reply's row ID. */
  targetId: string;
  points: number | null;
  note: string;
}

/**
 * The teacher gives points and an optional private note to a pupil's chapter or reply.
 *
 * @param client - the Supabase client
 * @param request - the work, the points (null removes them) and the note
 * @returns the saved points, or null after removing them
 * @throws ClassPointsError when refused (not_teacher, not_offered, range, note_*)
 */
export async function setTeacherPoints(
  client: AppSupabaseClient,
  request: TeacherPointsRequest,
): Promise<TeacherPoints | null> {
  // Leaving the points out is how the function takes them away.
  const { data, error } = await client.rpc('set_teacher_points', {
    target_kind: request.kind,
    target_id: request.targetId,
    ...(request.points === null ? {} : { new_points: request.points, new_note: request.note }),
  });
  if (error) throw classPointsErrorFrom(error);
  return teacherPointsFrom(data);
}

/**
 * The teacher points on a class thread's replies.
 *
 * @param client - the Supabase client
 * @param threadId - the thread's row ID
 * @returns the points, or null outside a class with points on
 * @throws ClassPointsError when the database can't be reached
 */
export async function fetchThreadTeacherPoints(
  client: AppSupabaseClient,
  threadId: string,
): Promise<ThreadTeacherPoints | null> {
  const { data, error } = await client.rpc('class_thread_teacher_points', {
    target_thread_id: threadId,
  });
  if (error) throw classPointsErrorFrom(error);
  return threadTeacherPointsFrom(data);
}
