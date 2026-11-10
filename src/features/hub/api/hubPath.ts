/**
 * The learning path: seven days, each with a title, a short lesson and a small task, and the
 * signed-in writer's own ticks (bundle GAPS-12g; board WritersHub, "Learning path · Your first
 * chapter in 7 days").
 *
 * Who calls it: hooks/useLearningPath.ts (the hub's card and the page at /hub/path) and
 * hooks/useStaffLearningPath.ts (the staff page at /staff/hub).
 * What it calls next (migration gaps12g_learning_path):
 * - writers_hub_learning_path(): the seven days in order with the caller's ticks;
 * - mark_learning_step(): ticks a day, or takes the tick off;
 * - admin_save_learning_step(): staff with the contests area change a day's words, logged.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { hubStaffErrorFrom } from './hubStaffErrors';

/** One day's words in both languages. */
export interface LearningStepTexts {
  titleRo: string;
  titleEn: string;
  /** Plain text; a blank line separates paragraphs. */
  lessonRo: string;
  lessonEn: string;
  taskRo: string;
  taskEn: string;
}

/** One day of the path as the writer sees it. */
export interface LearningStep extends LearningStepTexts {
  /** 1 to 7. */
  day: number;
  /** Whether the signed-in writer marked it done. */
  isDone: boolean;
}

/** The longest each text may be; the database checks the same limits. */
export const learningStepLimits = { title: 80, lesson: 1500, task: 300 } as const;

/**
 * The seven days in order, with the caller's ticks.
 *
 * @param client - the shared Supabase client
 * @returns the days
 * @throws when the read fails
 */
export async function fetchLearningPath(client: AppSupabaseClient): Promise<LearningStep[]> {
  const { data, error } = await client.rpc('writers_hub_learning_path');
  if (error !== null) throw new Error(`Could not read the learning path: ${error.message}`);
  return data.map((row) => ({
    day: row.day_number,
    titleRo: row.title_ro,
    titleEn: row.title_en,
    lessonRo: row.lesson_ro,
    lessonEn: row.lesson_en,
    taskRo: row.task_ro,
    taskEn: row.task_en,
    isDone: row.is_done,
  }));
}

/**
 * Ticks a day for the signed-in writer, or takes the tick off.
 *
 * @param client - the shared Supabase client
 * @param day - 1 to 7
 * @param isDone - true to tick, false to untick
 * @throws when the call fails
 */
export async function markLearningStep(
  client: AppSupabaseClient,
  day: number,
  isDone: boolean,
): Promise<void> {
  const { error } = await client.rpc('mark_learning_step', { target_day: day, is_done: isDone });
  if (error !== null) throw new Error(`Could not save the day: ${error.message}`);
}

/**
 * Changes one day's words; logged with the before and after values.
 *
 * @param client - the shared Supabase client
 * @param day - 1 to 7
 * @param texts - the title, lesson and task in both languages
 * @throws HubStaffError
 */
export async function saveLearningStep(
  client: AppSupabaseClient,
  day: number,
  texts: LearningStepTexts,
): Promise<void> {
  const { error } = await client.rpc('admin_save_learning_step', {
    target_day: day,
    step: {
      title_ro: texts.titleRo,
      title_en: texts.titleEn,
      lesson_ro: texts.lessonRo,
      lesson_en: texts.lessonEn,
      task_ro: texts.taskRo,
      task_en: texts.taskEn,
    },
  });
  if (error !== null) throw hubStaffErrorFrom(error);
}
