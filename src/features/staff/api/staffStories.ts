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
import type {
  CoverColourKey,
  CoverDesignKey,
  DrawnCoverChoice,
} from '@/components/covers/coverDesigns';
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import { storyRatingReasons } from '@/schemas/story';

import { listOf, numberOrNull, objectOf } from './marchNumbers';
import { staffStoryHistoryFrom, type StaffStoryVersion } from './staffStoryHistory';

/**
 * A story's status as staff see it: the writer's own state, or a staff decision (restricted is
 * S1-E11-08: still opens from its link, left out of lists).
 */
export const staffStoryStatuses = [
  'draft',
  'published',
  'restricted',
  'hidden',
  'removed',
] as const;
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
  /** Hidden or removed by staff, or null while it is shown (S1-E11-08). */
  moderatedState: 'hidden' | 'removed' | null;
  /** True once it has been published, so staff can open its words to remove a passage. */
  hasPublishedText: boolean;
  words: number;
  publishedAt: string | null;
}

/** Who can find a story: shown, restricted (out of lists), hidden or removed (S1-E11-08). */
export type StaffStoryVisibility = 'shown' | 'restricted' | 'hidden' | 'removed';

/** The settings staff may change (S1-E11-08); never the title, blurb, content note or words. */
export interface StaffStorySettings {
  rating: Enums<'story_rating'>;
  completionStatus: Enums<'completion_status'>;
  commentsEnabled: boolean;
  categorySlug: string | null;
  languageCode: string;
  isFanFiction: boolean;
  isParody: boolean;
  dealsWithAbuseOrCoercion: boolean;
  /** Why it is 16+ or 18+ (SPONSORS-f); empty below 16+. */
  ratingReasons: Enums<'story_rating_reason'>[];
  tagNames: string[];
}

/** A story's cover as the staff page draws it (S1-E11-08 criterion 1). */
export interface StaffStoryCover {
  coverKind: 'automatic' | 'drawn' | 'upload';
  /** The drawn design and colours, or null for an automatic or uploaded cover. */
  drawnCover: DrawnCoverChoice | null;
}

/** One story's overview. */
export interface StaffStoryOverview extends StaffStoryRow {
  /** For the uploaded cover's picture, read separately (story_cover_picture()). */
  slug: string;
  blurb: string;
  cover: StaffStoryCover;
  /** True while staff hide the title or the cover from readers (part b3). */
  titleHidden: boolean;
  coverHidden: boolean;
  createdAt: string;
  firstPublishedAt: string | null;
  deletedAt: string | null;
  commentsEnabled: boolean;
  /** True for staff who may change stories (S1-E11-08); support staff only look. */
  canChange: boolean;
  settings: StaffStorySettings;
  visibility: StaffStoryVisibility;
  chapters: StaffStoryChapter[];
  /** Every staff change, newest first (S1-E11-08, part 08b). */
  history: StaffStoryVersion[];
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
    moderatedState: moderatedStateOf(chapter['moderated_state']),
    hasPublishedText: chapter['has_published_text'] === true,
    words: numberOrNull(chapter['words']) ?? 0,
    publishedAt: textOrNull(chapter['published_at']),
  };
}

/**
 * A list of texts; anything else in it is left out.
 *
 * @param value - a JSON array of texts
 * @returns the texts
 */
function textList(value: Json | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

/**
 * A chapter's moderated state, or null while it is shown.
 *
 * @param value - the moderated_state field
 * @returns 'hidden', 'removed' or null
 */
function moderatedStateOf(value: Json | undefined): StaffStoryChapter['moderatedState'] {
  if (value === 'hidden' || value === 'removed') return value;
  return null;
}

/**
 * Reads the rating reasons, keeping only the ones the app knows, in the list's own order.
 *
 * @param value - the rating_reasons field
 * @returns the reasons
 */
function ratingReasonsFrom(value: Json | undefined): Enums<'story_rating_reason'>[] {
  const named = textList(value);
  return storyRatingReasons.filter((reason) => named.includes(reason));
}

/**
 * Reads the settings staff may change.
 *
 * @param value - the settings object of admin_story_overview()
 * @returns the settings
 */
export function staffStorySettingsFrom(value: Json | undefined): StaffStorySettings {
  const settings = objectOf(value);
  return {
    rating: String(settings['rating']) as Enums<'story_rating'>,
    completionStatus: settings['completion_status'] === 'completed' ? 'completed' : 'ongoing',
    commentsEnabled: settings['comments_enabled'] === true,
    categorySlug: textOrNull(settings['category_slug']),
    languageCode: String(settings['language_code'] ?? ''),
    isFanFiction: settings['is_fan_fiction'] === true,
    isParody: settings['is_parody'] === true,
    dealsWithAbuseOrCoercion: settings['deals_with_abuse_or_coercion'] === true,
    ratingReasons: ratingReasonsFrom(settings['rating_reasons']),
    tagNames: textList(settings['tag_names']),
  };
}

/**
 * Reads the visibility; anything unknown counts as hidden, the most careful reading.
 *
 * @param value - the visibility field
 * @returns the visibility
 */
function visibilityOf(value: Json | undefined): StaffStoryVisibility {
  if (value === 'shown' || value === 'restricted' || value === 'removed') return value;
  return 'hidden';
}

/**
 * A drawn cover's design and colours, or null when any of them is missing.
 *
 * @param cover - the cover object
 * @returns the choice, or null
 */
function drawnCoverChoiceFrom(cover: Record<string, Json | undefined>): DrawnCoverChoice | null {
  const design = textOrNull(cover['design']);
  const background = textOrNull(cover['background']);
  const accent = textOrNull(cover['accent']);
  if (design === null || background === null || accent === null) return null;
  return {
    design: design as CoverDesignKey,
    background: background as CoverColourKey,
    accent: accent as CoverColourKey,
  };
}

/**
 * Reads the cover. A drawn cover missing its design or a colour reads as automatic, so the page
 * always draws something.
 *
 * @param value - the cover object of admin_story_overview()
 * @returns the cover
 */
function staffStoryCoverFrom(value: Json | undefined): StaffStoryCover {
  const cover = objectOf(value);
  const kind = cover['kind'];
  if (kind === 'upload') return { coverKind: 'upload', drawnCover: null };
  const drawnCover = drawnCoverChoiceFrom(cover);
  if (kind === 'drawn' && drawnCover !== null) return { coverKind: 'drawn', drawnCover };
  return { coverKind: 'automatic', drawnCover: null };
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
 * Reads one story's overview: its details, chapter list and version history, never its words.
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
    slug: String(answer['slug'] ?? ''),
    blurb: String(answer['blurb'] ?? ''),
    cover: staffStoryCoverFrom(answer['cover']),
    titleHidden: answer['title_hidden'] === true,
    coverHidden: answer['cover_hidden'] === true,
    createdAt: String(answer['created_at']),
    firstPublishedAt: textOrNull(answer['first_published_at']),
    deletedAt: textOrNull(answer['deleted_at']),
    commentsEnabled: answer['comments_enabled'] === true,
    canChange: answer['can_change'] === true,
    settings: staffStorySettingsFrom(answer['settings']),
    visibility: visibilityOf(answer['visibility']),
    chapters: listOf(answer['chapters']).map(staffStoryChapterFrom),
    history: staffStoryHistoryFrom(answer['history']),
  };
}
