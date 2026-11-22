/**
 * The followers line on the Write page (bundle CALM-7b; design handover Step 4, "Followers line
 * graph"; board New-Write, "147 followers").
 *
 * Who calls it: hooks/useFollowersLine.ts.
 * What it calls next: writer_followers_line() (supabase/migrations/…_calm7b_followers_line.sql),
 * which counts the signed-in writer's own followers only and already applies the "fewer than 5"
 * rule: a count from one to four comes back as null.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ShownCount } from './dashboard';

/** The time ranges the "Time range" drop-down offers, in days. */
export const followersRanges = [7, 30, 90, 365] as const;

/** One of the four time ranges. */
export type FollowersRange = (typeof followersRanges)[number];

/** The range chosen when the page opens (handover Step 4). */
export const defaultFollowersRange: FollowersRange = 90;

/** What one point stands for: a day (7 and 30 days), a week (90) or a calendar month (365). */
export type FollowersStep = 'day' | 'week' | 'month';

/** One point of the line. */
export interface FollowersPoint {
  /** The first day of the point's day, week or month, YYYY-MM-DD (Romanian date). */
  startsOn: string;
  /** Followers at the end of it; null for "fewer than 5". */
  total: ShownCount;
  /** New follows inside it; null for "fewer than 5". */
  gained: ShownCount;
}

/**
 * What one point stands for in a range.
 *
 * @param range - the range in days
 * @returns day, week or month
 */
export function stepOf(range: FollowersRange): FollowersStep {
  if (range === 90) return 'week';
  if (range === 365) return 'month';
  return 'day';
}

/**
 * Reads a count that may be null ("fewer than 5").
 *
 * @param value - the JSON value
 * @returns the number, or null
 */
function countFrom(value: unknown): ShownCount {
  return typeof value === 'number' ? value : null;
}

/**
 * Turns the function's JSON answer into points, oldest first.
 *
 * @param data - writer_followers_line()'s answer, {points: [...]}
 * @returns the points
 */
export function followersPointsFrom(data: unknown): FollowersPoint[] {
  const points = (data as { points?: unknown } | null)?.points;
  if (!Array.isArray(points)) return [];
  return points.map((point: Record<string, unknown>) => ({
    startsOn: String(point.starts_on),
    total: countFrom(point.total),
    gained: countFrom(point.gained),
  }));
}

/**
 * Reads the signed-in writer's followers line for a range.
 *
 * @param client - the shared Supabase client
 * @param range - 7, 30, 90 or 365 days
 * @returns the points, oldest first
 * Errors: throws with Supabase's message when the database refuses or can't be reached.
 */
export async function fetchFollowersLine(
  client: AppSupabaseClient,
  range: FollowersRange,
): Promise<FollowersPoint[]> {
  const { data, error } = await client.rpc('writer_followers_line', { range_days: range });
  if (error !== null) throw new Error(`Could not read your followers: ${error.message}`);
  return followersPointsFrom(data);
}
