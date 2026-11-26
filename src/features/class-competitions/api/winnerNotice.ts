/**
 * winnerNotice: the "You're the winner" notice's calls (bundle BOOKS-8, part 8c; board G13, user
 * story 8.13: "Shown the first time they open the class after the results came out. Done closes
 * it.").
 *
 * Who calls it: useWinnerNotice. What it calls: class_winner_notice() and
 * dismiss_class_winner_notice() in the database (migration 20270205100810), which answer only the
 * signed-in Winner's own notice and remember when it was closed, so it shows once on any device.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { textOf } from './classCompetitions';
import { competitionErrorFrom } from './competitionErrors';

/** The notice the Winner still has to see. No score or point (user story 8.13). */
export interface WinnerNotice {
  competitionId: string;
  /** The competition's name. */
  name: string;
  /** The teacher who picked the Winner. */
  teacherName: string;
  /** The Winner's own pen name, for "by …". */
  winnerName: string;
  /** The winning chapter, or null when it was deleted since. */
  winningChapter: { storyTitle: string; storySlug: string; chapterCode: string } | null;
}

/**
 * Reads the database's answer.
 *
 * @param value - what class_winner_notice() returned
 * @returns the notice, or null when there is none to show
 */
export function winnerNoticeFrom(value: Json | null): WinnerNotice | null {
  // Step 1: no notice (not the Winner, already closed, signed out) answers null.
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const competitionId = textOf(value['competition_id']);
  if (competitionId === '') return null;
  // Step 2: the chapter only when all of its address is there, so the link never breaks.
  const storySlug = textOf(value['story_slug']);
  const chapterCode = textOf(value['chapter_code']);
  const hasChapter = storySlug !== '' && chapterCode !== '';
  return {
    competitionId,
    name: textOf(value['name']),
    teacherName: textOf(value['teacher_name']),
    winnerName: textOf(value['winner_name']),
    winningChapter: hasChapter
      ? { storyTitle: textOf(value['story_title']), storySlug, chapterCode }
      : null,
  };
}

/**
 * The notice the signed-in member still has to see in a class.
 *
 * @param client - the signed-in Supabase client
 * @param slug - the class's address
 * @returns the notice, or null
 * @throws CompetitionError when the database can't be reached
 */
export async function fetchWinnerNotice(
  client: AppSupabaseClient,
  slug: string,
): Promise<WinnerNotice | null> {
  const { data, error } = await client.rpc('class_winner_notice', { slug });
  if (error !== null) throw competitionErrorFrom(error);
  return winnerNoticeFrom(data);
}

/**
 * The Winner closes the notice; it never shows again.
 *
 * @param client - the signed-in Supabase client
 * @param competitionId - the competition the notice is about
 * @returns true when it was closed now, false when it was already closed
 * @throws CompetitionError when the database can't be reached
 */
export async function dismissWinnerNotice(
  client: AppSupabaseClient,
  competitionId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('dismiss_class_winner_notice', {
    target_competition_id: competitionId,
  });
  if (error !== null) throw competitionErrorFrom(error);
  return data === true;
}
