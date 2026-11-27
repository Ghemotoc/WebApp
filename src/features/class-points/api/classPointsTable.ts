/**
 * The teacher's class points table, typed (bundle CLASS-POINTS, part 1; stories S1-E8-14 and
 * S1-E8-16).
 *
 * Who calls it: hooks/useClassPoints.ts. What it calls: the SQL functions class_points_table()
 * (supabase/migrations/…_classpoints1_02_class_points.sql, with the notes count from
 * …_books8b_class_teacher_pages.sql) and report_pupil_class_points() (BOOKS-8b, board G09).
 *
 * The table has each pupil's two numbers and their chapters. It has no rank and no giver
 * (Robert, 13 Nov 2026): the database sends neither, so no screen can show one.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { classPointsErrorFrom, numberFrom, objectFrom } from './classPoints';

/** One chapter in the teacher's table. */
export interface TableChapter {
  chapterId: string;
  storySlug: string;
  storyTitle: string;
  chapterCode: string;
  chapterPosition: number;
  classPoints: number;
  /** Null when the teacher gave this chapter no points yet. */
  teacherPoints: number | null;
  /** True while a report about its points is open with our moderators. */
  isReported: boolean;
}

/** One pupil in the teacher's table. There is no rank and no giver (decisions 2 and 8). */
export interface TablePupil {
  handle: string;
  displayName: string;
  classPoints: number;
  teacherPoints: number;
  /** How many notes classmates wrote with the points this pupil received (BOOKS-8b). */
  notes: number;
  chapters: TableChapter[];
}

/** Why the teacher reports a pupil's points (board G09's three choices). */
export type PointsReportReason = 'swapped' | 'not_writing' | 'other';

/**
 * Reads one chapter of the table.
 *
 * @param value - the object
 * @returns the chapter, or null when it isn't one
 */
function tableChapterFrom(value: Json | undefined): TableChapter | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return {
    chapterId: String(row['chapter_id']),
    storySlug: String(row['story_slug']),
    storyTitle: String(row['story_title']),
    chapterCode: String(row['chapter_code']),
    chapterPosition: numberFrom(row['chapter_position']),
    classPoints: numberFrom(row['class_points']),
    teacherPoints: typeof row['teacher_points'] === 'number' ? row['teacher_points'] : null,
    isReported: row['is_reported'] === true,
  };
}

/**
 * Reads class_points_table()'s answer.
 *
 * @param data - the answer
 * @returns the pupils by name, or null for anyone but the teacher or while points are off
 */
export function classPointsTableFrom(data: Json): TablePupil[] | null {
  const row = objectFrom(data);
  if (row === null) return null;
  const pupils: TablePupil[] = [];
  for (const entry of Array.isArray(row['pupils']) ? row['pupils'] : []) {
    const pupil = objectFrom(entry);
    if (pupil === null) continue;
    const chapters = Array.isArray(pupil['chapters']) ? pupil['chapters'] : [];
    pupils.push({
      handle: String(pupil['handle']),
      displayName: String(pupil['display_name']),
      classPoints: numberFrom(pupil['class_points']),
      teacherPoints: numberFrom(pupil['teacher_points']),
      notes: numberFrom(pupil['notes']),
      chapters: chapters
        .map((chapter) => tableChapterFrom(chapter))
        .filter((chapter): chapter is TableChapter => chapter !== null),
    });
  }
  return pupils;
}

/**
 * The teacher's table.
 *
 * @param client - the Supabase client
 * @param slug - the class's address
 * @returns the pupils, or null for anyone but the teacher or while points are off
 * @throws ClassPointsError when the database can't be reached
 */
export async function fetchClassPointsTable(
  client: AppSupabaseClient,
  slug: string,
): Promise<TablePupil[] | null> {
  const { data, error } = await client.rpc('class_points_table', { slug });
  if (error) throw classPointsErrorFrom(error);
  return classPointsTableFrom(data);
}

/**
 * The teacher reports the class points one pupil received as odd, with a reason and an optional
 * note (BOOKS-8b; board G09, user story 8.9). The moderators read it and the class log gets a
 * line; the teacher never learns who gave the points.
 *
 * @param client - the Supabase client
 * @param request - the class, the pupil's handle, the reason and the note ('' for none)
 * @returns how many chapters' points went to the moderators
 * @throws ClassPointsError when refused (not_teacher, not_offered, reason, note_*)
 */
export async function reportPupilClassPoints(
  client: AppSupabaseClient,
  request: { slug: string; handle: string; reason: PointsReportReason; note: string },
): Promise<number> {
  const { data, error } = await client.rpc('report_pupil_class_points', {
    slug: request.slug,
    pupil_handle: request.handle,
    reason: request.reason,
    note: request.note.trim() === '' ? undefined : request.note,
  });
  if (error) throw classPointsErrorFrom(error);
  return numberFrom(objectFrom(data)?.['reported']);
}
