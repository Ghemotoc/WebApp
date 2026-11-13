/**
 * The teacher's class points table, typed (bundle CLASS-POINTS, part 1; stories S1-E8-14 and
 * S1-E8-16).
 *
 * Who calls it: hooks/useClassPoints.ts. What it calls: the SQL functions class_points_table()
 * and report_class_points() in supabase/migrations/…_classpoints1_02_class_points.sql.
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
  chapters: TableChapter[];
}

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
 * The teacher reports a chapter's points as suspicious to our moderators.
 *
 * @param client - the Supabase client
 * @param request - the chapter and an optional line saying what looks wrong
 * @throws ClassPointsError when refused (not_teacher, not_offered, note_*)
 */
export async function reportClassPoints(
  client: AppSupabaseClient,
  request: { chapterId: string; why: string },
): Promise<void> {
  const { error } = await client.rpc('report_class_points', {
    target_chapter_id: request.chapterId,
    why: request.why,
  });
  if (error) throw classPointsErrorFrom(error);
}
