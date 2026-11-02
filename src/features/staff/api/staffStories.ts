/**
 * Staff › Stories: every story on the platform, searched and filtered, and one story's overview
 * (bundle ADMIN-2, part a; story S1-E11-07; screens 8.10 and 8.11; architecture 1.8.2 to 1.8.4).
 *
 * Who calls it: hooks/useStaffStories.ts and hooks/useStaffStory.ts.
 * What it calls next: admin_search_stories() and admin_story_overview() in
 * supabase/migrations/…_admin2_a_every_story.sql. Both check the caller's staff role themselves
 * (owner, admin, moderator and support; the content editor is refused). This file only reads the
 * answers. Staff may see user IDs (architecture 1.6); the answers never carry a year of birth, an
 * email or a chapter's words (S1-E11-07, criterion 3).
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { listOf, numberOrNull, objectOf } from './marchNumbers';

/** A story's status as staff see it: the writer's own state, or a moderator's decision. */
export const staffStoryStatuses = ['draft', 'published', 'hidden', 'removed'] as const;
export type StaffStoryStatus = (typeof staffStoryStatuses)[number];

/** Where a story can be read today: by everyone, or only inside one class (S1-E8-11). */
export const staffStoryAudiences = ['everyone', 'class'] as const;
export type StaffStoryAudience = (typeof staffStoryAudiences)[number];

/** The search and filters, each null (or false) for "all". */
export interface StaffStoryFilters {
  searchText: string;
  status: StaffStoryStatus | null;
  categorySlug: string | null;
  languageCode: string | null;
  rating: Enums<'story_rating'> | null;
  readableBy: StaffStoryAudience | null;
  onlyOpenReports: boolean;
  onlyMinorWriters: boolean;
}

/** One row of the Stories list. */
export interface StaffStoryRow {
  id: string;
  title: string;
  ownerUserId: string;
  ownerHandle: string | null;
  ownerPenName: string | null;
  ownerStatus: Enums<'account_status'>;
  ownerIsMinor: boolean;
  categorySlug: string | null;
  languageCode: string;
  status: StaffStoryStatus;
  readableBy: StaffStoryAudience;
  rating: Enums<'story_rating'>;
  chapterCount: number;
  updatedAt: string;
  openReports: number;
  closedReports: number;
}

/** One page of the list. */
export interface StaffStoryPage {
  total: number;
  pageSize: number;
  stories: StaffStoryRow[];
}

/** One chapter in the overview: no words, and no title until it is published. */
export interface StaffStoryChapter {
  id: string;
  number: number;
  title: string | null;
  status: string;
  isHidden: boolean;
  words: number;
  publishedAt: string | null;
}

/** One story's overview. */
export interface StaffStoryOverview extends StaffStoryRow {
  blurb: string;
  createdAt: string;
  firstPublishedAt: string | null;
  deletedAt: string | null;
  commentsEnabled: boolean;
  /** True for staff who may change stories (part b); support staff only look. */
  canChange: boolean;
  chapters: StaffStoryChapter[];
}

/** Why a call failed. */
export type StaffStoryFailure = 'not_allowed' | 'no_such_story' | 'unreachable';

/** The error a refused call throws. */
export class StaffStoryError extends Error {
  constructor(readonly failure: StaffStoryFailure) {
    super(`The staff stories call failed: ${failure}`);
    this.name = 'StaffStoryError';
  }
}

/**
 * Turns a database error into a StaffStoryError.
 *
 * @param error - Postgres's hint and code
 * @returns the error: by hint, then 42501 as not_allowed, otherwise unreachable
 */
export function staffStoryErrorFrom(error: { hint?: string | null; code?: string }) {
  if (error.hint === 'not_allowed' || error.code === '42501')
    return new StaffStoryError('not_allowed');
  if (error.hint === 'no_such_story') return new StaffStoryError('no_such_story');
  return new StaffStoryError('unreachable');
}

/**
 * A text value, or null when the database sent anything else.
 *
 * @param value - one field of the answer
 * @returns the text, or null
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * A status from the answer; anything unknown counts as a draft, the most careful reading.
 *
 * @param value - the status field
 * @returns the status
 */
function statusOf(value: Json | undefined): StaffStoryStatus {
  const found = staffStoryStatuses.find((status) => status === value);
  return found ?? 'draft';
}

/**
 * Reads one row of admin_search_stories() (or the start of admin_story_overview()).
 *
 * @param value - one story from the answer
 * @returns the row
 */
export function staffStoryRowFrom(value: Json | undefined): StaffStoryRow {
  const row = objectOf(value);
  const reports = objectOf(row['reports']);
  return {
    id: String(row['id']),
    title: String(row['title'] ?? ''),
    ownerUserId: String(row['owner_user_id']),
    ownerHandle: textOrNull(row['owner_handle']),
    ownerPenName: textOrNull(row['owner_pen_name']),
    ownerStatus: String(row['owner_status']) as Enums<'account_status'>,
    ownerIsMinor: row['owner_is_minor'] === true,
    categorySlug: textOrNull(row['category_slug']),
    languageCode: String(row['language_code'] ?? ''),
    status: statusOf(row['status']),
    readableBy: row['readable_by'] === 'class' ? 'class' : 'everyone',
    rating: String(row['rating']) as Enums<'story_rating'>,
    chapterCount: numberOrNull(row['chapter_count']) ?? 0,
    updatedAt: String(row['updated_at']),
    openReports: numberOrNull(reports['open']) ?? 0,
    closedReports: numberOrNull(reports['closed']) ?? 0,
  };
}

/**
 * Reads one chapter of the overview.
 *
 * @param chapter - one chapter from the answer
 * @returns the chapter
 */
function staffStoryChapterFrom(chapter: Record<string, Json | undefined>): StaffStoryChapter {
  return {
    id: String(chapter['id']),
    number: numberOrNull(chapter['number']) ?? 0,
    title: textOrNull(chapter['title']),
    status: String(chapter['status'] ?? ''),
    isHidden: chapter['is_hidden'] === true,
    words: numberOrNull(chapter['words']) ?? 0,
    publishedAt: textOrNull(chapter['published_at']),
  };
}

/**
 * Searches every story (50 a page, the latest update first).
 *
 * @param client - the shared Supabase client
 * @param filters - the search text and filters
 * @param pageNumber - the page, from 0
 * @returns the page and the total found
 * @throws StaffStoryError (not_allowed for the content editor and members, or unreachable)
 */
export async function searchStaffStories(
  client: AppSupabaseClient,
  filters: StaffStoryFilters,
  pageNumber: number,
): Promise<StaffStoryPage> {
  // Step 1: the filters as the database names them; an unset filter is left out.
  const { data, error } = await client.rpc('admin_search_stories', {
    search_text: filters.searchText,
    story_status: filters.status ?? undefined,
    category_slug: filters.categorySlug ?? undefined,
    language_code: filters.languageCode ?? undefined,
    wanted_rating: filters.rating ?? undefined,
    readable_by: filters.readableBy ?? undefined,
    only_open_reports: filters.onlyOpenReports,
    only_minor_writers: filters.onlyMinorWriters,
    page_number: pageNumber,
  });
  if (error !== null) throw staffStoryErrorFrom(error);
  // Step 2: the answer as typed rows.
  const answer = objectOf(data);
  return {
    total: numberOrNull(answer['total']) ?? 0,
    pageSize: numberOrNull(answer['page_size']) ?? 50,
    stories: listOf(answer['stories']).map(staffStoryRowFrom),
  };
}

/**
 * Reads one story's overview: its details and chapter list, never its words.
 *
 * @param client - the shared Supabase client
 * @param storyId - the story
 * @returns the overview
 * @throws StaffStoryError (not_allowed, no_such_story or unreachable)
 */
export async function fetchStaffStory(
  client: AppSupabaseClient,
  storyId: string,
): Promise<StaffStoryOverview> {
  const { data, error } = await client.rpc('admin_story_overview', { target_story_id: storyId });
  if (error !== null) throw staffStoryErrorFrom(error);
  const answer = objectOf(data);
  return {
    ...staffStoryRowFrom(data),
    blurb: String(answer['blurb'] ?? ''),
    createdAt: String(answer['created_at']),
    firstPublishedAt: textOrNull(answer['first_published_at']),
    deletedAt: textOrNull(answer['deleted_at']),
    commentsEnabled: answer['comments_enabled'] === true,
    canChange: answer['can_change'] === true,
    chapters: listOf(answer['chapters']).map(staffStoryChapterFrom),
  };
}
