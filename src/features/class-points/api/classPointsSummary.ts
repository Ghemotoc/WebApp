/**
 * Class points on a class page (bundle CLASS-POINTS, part 1; story S1-E8-13; the class's week
 * totals since BOOKS-8 part 8b, board G08): the summary a pupil or the teacher reads, and the
 * teacher's switch. Split from classPoints.ts so each file stays small.
 *
 * Who calls it: hooks/useClassPoints.ts, and the class page's cards for the types. What it calls
 * next: class_points_summary() and set_class_points() in
 * supabase/migrations/…_classpoints1_02_class_points.sql (the summary's week totals in
 * …_books8b_class_teacher_pages.sql).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { classPointsErrorFrom, numberFrom, objectFrom } from './classPoints';

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
  /** The chapters the pupil gave points to this week, newest first (BOOKS-8). Empty for a teacher. */
  given: GivenPoints[];
  /** This week's totals for the whole class, for the teacher only (BOOKS-8b); null for a pupil. */
  classWeek: ClassWeekTotals | null;
}

/**
 * This week's totals for the whole class, never one pupil's (BOOKS-8b; board G08's "This week",
 * user story 8.8).
 */
export interface ClassWeekTotals {
  /** Class points given since Monday, and how many every pupil could give together. */
  given: number;
  possible: number;
  /** Notes classmates wrote with their points. */
  notes: number;
  /** Chapters shared with the class since Monday. */
  chaptersShared: number;
  /** Open reports on the class's points, waiting for the moderators. */
  reported: number;
}

/**
 * Reads the teacher's 'week' object of class_points_summary().
 *
 * @param value - the object, or null for a pupil
 * @returns the totals, or null
 */
function classWeekFrom(value: Json | undefined): ClassWeekTotals | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return {
    given: numberFrom(row['given']),
    possible: numberFrom(row['possible']),
    notes: numberFrom(row['notes']),
    chaptersShared: numberFrom(row['chapters_shared']),
    reported: numberFrom(row['reported']),
  };
}

/** One chapter a pupil gave points to this week: only ever their own gifts (board G03). */
export interface GivenPoints {
  storySlug: string;
  storyTitle: string;
  chapterCode: string;
  chapterPosition: number;
  writerName: string;
  points: number;
}

/**
 * Reads the 'given' list of class_points_summary().
 *
 * @param value - the list, or null for a teacher
 * @returns the gifts; empty when there are none
 */
function givenPointsFrom(value: Json | undefined): GivenPoints[] {
  if (!Array.isArray(value)) return [];
  const gifts: GivenPoints[] = [];
  for (const item of value) {
    const row = objectFrom(item);
    if (row === null) continue;
    gifts.push({
      storySlug: String(row['story_slug']),
      storyTitle: String(row['story_title']),
      chapterCode: String(row['chapter_code']),
      chapterPosition: numberFrom(row['chapter_position']),
      writerName: String(row['writer_name']),
      points: numberFrom(row['points']),
    });
  }
  return gifts;
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
    given: givenPointsFrom(row['given']),
    classWeek: isPupil ? null : classWeekFrom(row['week']),
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
