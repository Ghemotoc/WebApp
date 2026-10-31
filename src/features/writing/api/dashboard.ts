/**
 * The writer dashboard's numbers (story S1-E3-07; board WriterDashboard 4.1).
 *
 * Who calls it: hooks/useWriterDashboard.ts.
 * What it calls next: writer_dashboard() (supabase/migrations/…_s1_e3_07_writer_dashboard.sql),
 * which adds up the writer's own chapters' totals and already applies the "fewer than 5" rule:
 * any count from one to four comes back as null, and the screen shows "fewer than 5". It never
 * returns a reader's ID or a list of readers (criterion 3).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import type { Enums } from '@/lib/database.types';

/** The tiles' time period: all time, or the last 30 days. */
export type DashboardPeriod = 'all' | 'last_30_days';

/** A count as the writer may see it: a number, or null for "fewer than 5". */
export type ShownCount = number | null;

/** The five tiles (and shares, for later). */
export interface DashboardTotals {
  reads: ShownCount;
  /** A whole percentage; null when fewer than 5 readers kept a place. */
  readThrough: ShownCount;
  likes: ShownCount;
  /** How many chapters have at least one like ("Across 6 chapters"). */
  likedChapters: number;
  comments: ShownCount;
  followers: ShownCount;
  shares: ShownCount;
  /** Every follower, whatever the period (the chart's heading). */
  followersAllTime: ShownCount;
}

/** One chapter's row in a story's table, and in "Not published yet". */
export interface DashboardChapter {
  storySlug: string;
  chapterCode: string;
  position: number;
  title: string;
  status: Enums<'chapter_status'>;
  scheduledFor: string | null;
  firstPublishedAt: string | null;
  editedAt: string | null;
  /** Set when the writer took a published chapter back (S1-E3-04). */
  unpublishedAt: string | null;
  draftSavedAt: string | null;
  wordCount: number;
  reads: ShownCount;
  readThrough: ShownCount;
  likes: ShownCount;
  comments: ShownCount;
  shares: ShownCount;
}

/** One bar of "Followers over time". */
export interface FollowersWeek {
  /** The week's Monday, YYYY-MM-DD (Romanian date). */
  weekStart: string;
  total: ShownCount;
}

/** One of the "Latest on your chapters" cards. */
export interface LatestComment {
  displayName: string;
  handle: string;
  storySlug: string;
  chapterCode: string;
  chapterPosition: number;
  body: string;
  createdAt: string;
}

/** Everything the dashboard shows. */
export interface WriterDashboard {
  period: DashboardPeriod;
  totals: DashboardTotals;
  /** When the writer's first chapter went out ("Since chapter 1 on 5 September"); null before. */
  firstPublishedAt: string | null;
  followersByWeek: FollowersWeek[];
  chapters: DashboardChapter[];
  latestComments: LatestComment[];
}

/** A plain JSON object, for reading the function's answer field by field. */
type JsonObject = Record<string, unknown>;

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
 * Reads a text field that may be missing.
 *
 * @param value - the JSON value
 * @returns the text, or null
 */
function textOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

/** Turns the totals object into DashboardTotals. */
function totalsFrom(row: JsonObject): DashboardTotals {
  return {
    reads: countFrom(row.reads),
    readThrough: countFrom(row.read_through),
    likes: countFrom(row.likes),
    likedChapters: Number(row.liked_chapters ?? 0),
    comments: countFrom(row.comments),
    followers: countFrom(row.followers),
    shares: countFrom(row.shares),
    followersAllTime: countFrom(row.followers_all_time),
  };
}

/** Turns one chapter object into a DashboardChapter. */
function chapterFrom(row: JsonObject): DashboardChapter {
  return {
    storySlug: String(row.story_slug),
    chapterCode: String(row.chapter_code),
    position: Number(row.position),
    title: String(row.title ?? ''),
    status: row.status as Enums<'chapter_status'>,
    scheduledFor: textOrNull(row.scheduled_for),
    firstPublishedAt: textOrNull(row.first_published_at),
    editedAt: textOrNull(row.edited_at),
    unpublishedAt: textOrNull(row.unpublished_at),
    draftSavedAt: textOrNull(row.draft_saved_at),
    wordCount: Number(row.word_count ?? 0),
    reads: countFrom(row.reads),
    readThrough: countFrom(row.read_through),
    likes: countFrom(row.likes),
    comments: countFrom(row.comments),
    shares: countFrom(row.shares),
  };
}

/** Turns one comment object into a LatestComment. */
function commentFrom(row: JsonObject): LatestComment {
  return {
    displayName: String(row.display_name),
    handle: String(row.handle),
    storySlug: String(row.story_slug),
    chapterCode: String(row.chapter_code),
    chapterPosition: Number(row.chapter_position),
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

/**
 * Turns the function's JSON answer into a WriterDashboard.
 *
 * @param data - writer_dashboard()'s answer
 * @returns the dashboard
 */
export function dashboardFrom(data: unknown): WriterDashboard {
  const row = (data ?? {}) as JsonObject;
  const list = (value: unknown) => (Array.isArray(value) ? (value as JsonObject[]) : []);
  return {
    period: row.period === 'last_30_days' ? 'last_30_days' : 'all',
    totals: totalsFrom((row.totals ?? {}) as JsonObject),
    firstPublishedAt: textOrNull(row.first_published_at),
    followersByWeek: list(row.followers_by_week).map((week) => ({
      weekStart: String(week.week_start),
      total: countFrom(week.total),
    })),
    chapters: list(row.chapters).map(chapterFrom),
    latestComments: list(row.latest_comments).map(commentFrom),
  };
}

/**
 * Reads the signed-in writer's dashboard.
 *
 * @param client - the shared Supabase client
 * @param period - the tiles' period
 * @returns the dashboard
 * Errors: throws with Supabase's message when the database refuses or can't be reached.
 */
export async function fetchWriterDashboard(
  client: AppSupabaseClient,
  period: DashboardPeriod,
): Promise<WriterDashboard> {
  const { data, error } = await client.rpc('writer_dashboard', { period });
  if (error !== null) throw new Error(`Could not read your numbers: ${error.message}`);
  return dashboardFrom(data);
}
