/**
 * The writing month: the signed-in writer's words this calendar month against a goal, the streak
 * of days in a row with new words, and five badges (bundle GAPS-12f; board WritersHub, "Writing
 * month" and "Badges this month").
 *
 * Who calls it: hooks/useHubMonth.ts, for HubMonth on the Writers' hub.
 * What it calls next: my_writing_month() (migration gaps12f_writing_month), which reads only the
 * caller's own activity: the words-per-day rows a trigger keeps from their saves, their comments
 * and their contest entries. Nobody else can read any of it.
 */
import { z } from 'zod';

import type { AppSupabaseClient } from '@/lib/supabase';

/** The badges, in the board's order. */
export const monthBadgeKeys = [
  'streak_5',
  'first_5000',
  'comments_10',
  'contest_entry',
  'words_15000',
] as const;

/** One badge's key. */
export type MonthBadgeKey = (typeof monthBadgeKeys)[number];

/** What my_writing_month() answers. */
const monthSchema = z.object({
  month_start: z.string(),
  goal: z.number().int().positive(),
  words: z.number().int().nonnegative(),
  streak_days: z.number().int().nonnegative(),
  badges: z.object({
    streak_5: z.boolean(),
    first_5000: z.boolean(),
    comments_10: z.boolean(),
    contest_entry: z.boolean(),
    words_15000: z.boolean(),
  }),
});

/** The writer's month as the hub shows it. */
export interface HubMonth {
  /** The month's first day (YYYY-MM-DD, Romania time). */
  monthStart: string;
  /** The month's goal in words. */
  goal: number;
  /** Net new words this month. */
  words: number;
  /** Days in a row with new words, ending today or yesterday. */
  streakDays: number;
  /** Which badges are earned this month. */
  badges: Record<MonthBadgeKey, boolean>;
}

/**
 * The share of the goal reached, as a whole percentage for the bar and its words.
 *
 * @param words - the month's words
 * @param goal - the month's goal
 * @returns 0 to 100; past the goal it stays at 100, so the bar never overflows
 */
export function monthPercent(words: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((words / goal) * 100)));
}

/**
 * Reads the signed-in writer's month.
 *
 * @param client - the shared Supabase client
 * @returns the words, the goal, the streak and the badges
 * @throws when the database refuses (nobody signed in) or answers something unexpected
 */
export async function fetchHubMonth(client: AppSupabaseClient): Promise<HubMonth> {
  // Step 1: ask the database; it works out who is asking from the session.
  const { data, error } = await client.rpc('my_writing_month');
  if (error !== null) throw new Error(`Could not read the writing month: ${error.message}`);
  // Step 2: check the shape, so a change in the function fails here and not in the card.
  const month = monthSchema.parse(data);
  return {
    monthStart: month.month_start,
    goal: month.goal,
    words: month.words,
    streakDays: month.streak_days,
    badges: month.badges,
  };
}
