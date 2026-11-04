/**
 * Staff › Stories › one story: what staff may change, each with a reason (bundle ADMIN-2, part b1;
 * story S1-E11-08, part 08a; screen 8.11; architecture 1.8.5).
 *
 * Staff may show, restrict or hide a story, hide one chapter or show it again, and change the
 * settings and details (rating, finished or ongoing, comments, category, language, content labels
 * and tags). They never edit the writer's words (decided 16 Oct 2026, late evening, Q14), so
 * nothing here sends a title, a blurb or a content note. The one cut they may make is removing an
 * exact unlawful passage, which the marker "[Removed by the moderation team]" replaces (part b2);
 * Restore brings back what one earlier change replaced (part b2). Staff may hide the title (readers
 * see "Title hidden by the moderation team") or the cover (readers see the automatic cover) until
 * the writer changes it, but never write a new title (part b3).
 *
 * Who calls it: hooks/useChangeStaffStory.ts.
 * What it calls next: admin_change_story_settings(), admin_set_story_visibility() and
 * admin_set_chapter_visibility() in supabase/migrations/…_admin2_b1_change_story.sql, and
 * admin_remove_chapter_passage() and admin_restore_story_revision() in
 * supabase/migrations/…_admin2_b2_history_and_passages.sql, and admin_set_story_presentation() in
 * supabase/migrations/…_admin2_b3_hide_title_cover.sql. Each one
 * checks the caller's role (owner, admin, moderator), stores a version, writes the audit log with
 * the owner's user ID and tells the writer: a statement of reasons when content is restricted,
 * a notification otherwise.
 */
import type { Enums, Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The reasons staff pick from (S1-E11-08 criterion 2); the database refuses any other. */
export const storyChangeReasons = [
  'rating_rules',
  'story_details',
  'community_rules',
  'illegal_content',
  'personal_data',
  'copyright',
  'writer_asked',
  'other',
] as const;
export type StoryChangeReasonCode = (typeof storyChangeReasons)[number];

/** A reason: the code from the list and a few words that the writer reads too. */
export interface StoryChangeReason {
  code: StoryChangeReasonCode;
  text: string;
}

/** The settings staff can change; a field left out keeps its value. */
export interface StaffStorySettingsChange {
  rating?: Enums<'story_rating'>;
  completionStatus?: Enums<'completion_status'>;
  commentsEnabled?: boolean;
  categorySlug?: string;
  languageCode?: string;
  isFanFiction?: boolean;
  isParody?: boolean;
  dealsWithAbuseOrCoercion?: boolean;
  ratingReasons?: Enums<'story_rating_reason'>[];
  tagNames?: string[];
}

/** Why a change failed. */
export type StoryChangeFailure =
  | 'not_allowed'
  | 'no_such_story'
  | 'reason_needed'
  | 'nothing_changed'
  | 'removed_by_case'
  | 'text_changed'
  | 'no_such_case'
  | 'cannot_restore'
  | 'not_published'
  | 'passage_too_long'
  | 'no_such_version'
  | 'no_cover'
  | 'not_valid'
  | 'unreachable';

/** The error a refused change throws. */
export class StoryChangeError extends Error {
  constructor(readonly failure: StoryChangeFailure) {
    super(`The story change failed: ${failure}`);
    this.name = 'StoryChangeError';
  }
}

/** The failures the database names in its hint. */
const namedFailures: StoryChangeFailure[] = [
  'not_allowed',
  'no_such_story',
  'reason_needed',
  'nothing_changed',
  'removed_by_case',
  'text_changed',
  'no_such_case',
  'cannot_restore',
  'not_published',
  'passage_too_long',
  'no_such_version',
  'no_cover',
];

/**
 * Turns a database error into a StoryChangeError.
 *
 * @param error - Postgres's hint and code
 * @returns the error: by hint; 42501 as not_allowed; any other refused value (the writer's own
 *   rules, such as abuse needing 16+) as not_valid; otherwise unreachable
 */
export function storyChangeErrorFrom(error: { hint?: string | null; code?: string }) {
  const named = namedFailures.find((failure) => failure === error.hint);
  if (named !== undefined) return new StoryChangeError(named);
  if (error.code === '42501') return new StoryChangeError('not_allowed');
  if (error.code === '23514' || error.code === '22P02') return new StoryChangeError('not_valid');
  return new StoryChangeError('unreachable');
}

/**
 * The settings as the database names them; fields left out are not sent.
 *
 * @param change - the settings that changed
 * @returns the JSON object for admin_change_story_settings()
 */
export function settingsChangeJson(change: StaffStorySettingsChange): Json {
  const named: Record<string, Json | undefined> = {
    rating: change.rating,
    completion_status: change.completionStatus,
    comments_enabled: change.commentsEnabled,
    category_slug: change.categorySlug,
    language_code: change.languageCode,
    is_fan_fiction: change.isFanFiction,
    is_parody: change.isParody,
    deals_with_abuse_or_coercion: change.dealsWithAbuseOrCoercion,
    rating_reasons: change.ratingReasons,
    tag_names: change.tagNames,
  };
  const sent: Record<string, Json> = {};
  for (const [field, value] of Object.entries(named)) {
    if (value !== undefined) sent[field] = value;
  }
  return sent;
}

/**
 * Changes a story's settings and details.
 *
 * @param client - the shared Supabase client
 * @param storyId - the story
 * @param change - the settings that changed
 * @param reason - why
 * @throws StoryChangeError
 */
export async function changeStaffStorySettings(
  client: AppSupabaseClient,
  storyId: string,
  change: StaffStorySettingsChange,
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_change_story_settings', {
    target_story_id: storyId,
    changes: settingsChangeJson(change),
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}

/**
 * Shows, restricts or hides a story.
 *
 * @param client - the shared Supabase client
 * @param storyId - the story
 * @param visibility - shown, restricted or hidden
 * @param reason - why
 * @throws StoryChangeError
 */
export async function setStaffStoryVisibility(
  client: AppSupabaseClient,
  storyId: string,
  visibility: 'shown' | 'restricted' | 'hidden',
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_set_story_visibility', {
    target_story_id: storyId,
    wanted_visibility: visibility,
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}

/**
 * Hides one chapter, or shows it again.
 *
 * @param client - the shared Supabase client
 * @param chapterId - the chapter
 * @param visibility - shown or hidden
 * @param reason - why
 * @throws StoryChangeError
 */
export async function setStaffChapterVisibility(
  client: AppSupabaseClient,
  chapterId: string,
  visibility: 'shown' | 'hidden',
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_set_chapter_visibility', {
    target_chapter_id: chapterId,
    wanted_visibility: visibility,
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}

/** One passage staff selected in a chapter's words. */
export interface ChapterPassage {
  /** The exact words selected. */
  text: string;
  /** Which copy of those words, from 0, when they appear more than once. */
  occurrence: number;
  /** The case it is removed for (R-000123 and so on), or empty for none. */
  caseReference: string;
}

/**
 * Removes one exact passage from a published chapter; the marker takes its place and the writer
 * gets a statement of reasons.
 *
 * @param client - the shared Supabase client
 * @param chapterId - the chapter
 * @param passage - the selected words, which copy and the case
 * @param reason - why
 * @throws StoryChangeError (text_changed when the writer changed those words since)
 */
export async function removeStaffChapterPassage(
  client: AppSupabaseClient,
  chapterId: string,
  passage: ChapterPassage,
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_remove_chapter_passage', {
    target_chapter_id: chapterId,
    passage: passage.text,
    occurrence: passage.occurrence,
    case_reference: passage.caseReference,
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}

/**
 * Brings back what one earlier change replaced, as a new version; the writer is told.
 *
 * @param client - the shared Supabase client
 * @param versionId - the earlier version
 * @param reason - why
 * @throws StoryChangeError (nothing_changed when the story already holds those values)
 */
export async function restoreStaffStoryVersion(
  client: AppSupabaseClient,
  versionId: string,
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_restore_story_revision', {
    target_revision_id: versionId,
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}

/** The part of a story staff may hide from readers (S1-E11-08): its title or its cover. */
export type StoryPresentationPart = 'title' | 'cover';

/**
 * Hides a story's title or cover from readers, or shows it again. The writer's title and cover
 * stay as they wrote them; showing again sends the writer a notification, hiding a statement of
 * reasons.
 *
 * @param client - the shared Supabase client
 * @param storyId - the story
 * @param change - the part (the title or the cover) and whether it shows or is hidden
 * @param reason - why
 * @throws StoryChangeError (no_cover when the story already shows the automatic cover)
 */
export async function setStaffStoryPresentation(
  client: AppSupabaseClient,
  storyId: string,
  change: { part: StoryPresentationPart; state: 'shown' | 'hidden' },
  reason: StoryChangeReason,
): Promise<void> {
  const { error } = await client.rpc('admin_set_story_presentation', {
    target_story_id: storyId,
    story_part: change.part,
    wanted_state: change.state,
    reason_code: reason.code,
    reason_text: reason.text,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
}
