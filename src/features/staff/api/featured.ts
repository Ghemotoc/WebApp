/**
 * Reads the ranking for Stories › Featured and saves the picks (story S1-E5-10, bundle LOOK-4a;
 * Robert, 6 Nov 2026: staff see the ranks of all current active stories and pick from them; the
 * writer must be 16 or over).
 *
 * Who calls it: hooks/useFeaturedPicks.ts.
 * What it calls next: admin_featured_candidates() and admin_set_featured_picks() in
 * …_look4a_02_featured_picks.sql. Each checks the caller's role (owner and admin) and staff
 * session itself; the second also refuses a story that can't be featured and writes the audit
 * log. This file only passes the answers on.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The screen's four views (Robert, 6 Nov 2026). */
export const featuredViews = ['all', 'rising', 'new_writers', 'promising'] as const;
export type FeaturedView = (typeof featuredViews)[number];

/** Why a story can't be featured (featured_ineligible_reason()). */
export type IneligibleReason =
  | 'not_found'
  | 'not_public'
  | 'moderated'
  | 'restricted'
  | 'no_chapter'
  | 'writer_not_active'
  | 'writer_under_16'
  | 'writer_age_unknown';

/** One current active story with its signals. */
export interface FeaturedCandidate {
  id: string;
  slug: string;
  title: string;
  writerHandle: string | null;
  writerPenName: string | null;
  /** 1 is the top; null for a story the ranking hasn't scored yet. */
  rank: number | null;
  /** Places climbed in 7 days (negative: fell); null without a snapshot from a week ago. */
  rankChange: number | null;
  score: number;
  readsThisWeek: number;
  /** From 0 to 1. */
  readThrough: number;
  followers: number;
  firstPublishedAt: string | null;
  rating: Enums<'story_rating'>;
  categorySlug: string;
  isNewWriter: boolean;
  /** Null when the story can be featured. */
  ineligibleReason: IneligibleReason | null;
}

/** The screen's data. */
export interface FeaturedCandidates {
  total: number;
  medianReadsThisWeek: number;
  featuredMax: number;
  /** The story IDs in the band now, in order. */
  picks: string[];
  stories: FeaturedCandidate[];
}

/** The reasons a call can fail, each with its own message on the screen. */
export type FeaturedFailure = 'not_allowed' | 'refused' | 'unreachable';

/** The error a refused call throws. */
export class FeaturedError extends Error {
  constructor(public readonly failure: FeaturedFailure) {
    super(failure);
    this.name = 'FeaturedError';
  }
}

/**
 * Turns a database error into a reason.
 *
 * @param error - Postgres's error code
 * @returns the reason
 */
export function featuredFailureOf(error: { code?: string }): FeaturedFailure {
  if (error.code === '42501') return 'not_allowed';
  if (error.code === '23514' || error.code === '22023') return 'refused';
  return 'unreachable';
}

/** One row as the database answers it. */
interface CandidateRow {
  id: string;
  slug: string;
  title: string;
  writer_handle: string | null;
  writer_pen_name: string | null;
  rank: number | null;
  rank_change: number | null;
  score: number;
  reads_7d: number;
  read_through: number;
  followers: number;
  first_published_at: string | null;
  rating: Enums<'story_rating'>;
  category_slug: string;
  is_new_writer: boolean;
  ineligible_reason: IneligibleReason | null;
}

/**
 * Turns one row into the screen's shape.
 *
 * @param row - the row
 * @returns the candidate
 */
function candidateFrom(row: CandidateRow): FeaturedCandidate {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    writerHandle: row.writer_handle,
    writerPenName: row.writer_pen_name,
    rank: row.rank,
    rankChange: row.rank_change,
    score: row.score,
    readsThisWeek: row.reads_7d,
    readThrough: row.read_through,
    followers: row.followers,
    firstPublishedAt: row.first_published_at,
    rating: row.rating,
    categorySlug: row.category_slug,
    isNewWriter: row.is_new_writer,
    ineligibleReason: row.ineligible_reason,
  };
}

/**
 * Reads one view of the ranking (the screen asks for up to 500 and sorts them itself).
 *
 * @param client - the shared Supabase client
 * @param view - which view
 * @returns the stories, the current picks and the limits
 * Errors: throws FeaturedError (not_allowed, refused or unreachable).
 */
export async function fetchFeaturedCandidates(
  client: AppSupabaseClient,
  view: FeaturedView,
): Promise<FeaturedCandidates> {
  // Step 1: ask for the view; the database checks who is asking.
  const { data, error } = await client.rpc('admin_featured_candidates', {
    view,
    page_size: 500,
    page_offset: 0,
  });
  if (error !== null) throw new FeaturedError(featuredFailureOf(error));
  // Step 2: the answer is one JSON object.
  const answer = data as unknown as {
    total: number;
    median_reads_7d: number;
    featured_max: number;
    picks: string[];
    stories: CandidateRow[];
  };
  return {
    total: answer.total,
    medianReadsThisWeek: answer.median_reads_7d,
    featuredMax: answer.featured_max,
    picks: answer.picks,
    stories: answer.stories.map(candidateFrom),
  };
}

/**
 * Replaces the picks with these stories, in this order.
 *
 * @param client - the shared Supabase client
 * @param storyIds - the stories, first first
 * @param reason - why (for the audit log)
 * Errors: throws FeaturedError; refused covers a story that can't be featured, too many stories
 *   and an empty reason.
 */
export async function saveFeaturedPicks(
  client: AppSupabaseClient,
  storyIds: string[],
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_set_featured_picks', { story_ids: storyIds, reason });
  if (error !== null) throw new FeaturedError(featuredFailureOf(error));
}
