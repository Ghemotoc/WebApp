/**
 * Staff › Stories › one story: its version history, a published chapter's words and the words of
 * a removed passage (bundle ADMIN-2, part b2; story S1-E11-08, part 08b; screen 8.11).
 *
 * Every staff change to a story is a version: who, when, the reason and the values before and
 * after. A removed passage's words are never in a version, because support staff can read the
 * history too; staff who may change stories ask for them separately, and that read is logged.
 * A chapter's words come back only once it has been published (what readers already see), never a
 * draft, and only to staff who may change stories (they select the passage to remove in them).
 *
 * Who calls it: api/staffStories.ts (the history inside the overview), hooks/useStaffChapterText.ts
 * and components/stories/RemovedPassageReveal.tsx.
 * What it calls next: admin_chapter_text() and admin_removed_passage() in
 * supabase/migrations/…_admin2_b2_history_and_passages.sql; each checks the caller's role itself.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { listOf, numberOrNull, objectOf } from './marchNumbers';
import { storyChangeErrorFrom } from './staffStoryChanges';

/** What one version changed: the settings, the story's visibility, a chapter's, or a passage. */
export type StaffStoryVersionKind = 'settings' | 'visibility' | 'chapter_visibility' | 'passage';

/** One version in a story's history. */
export interface StaffStoryVersion {
  id: string;
  at: string;
  kind: StaffStoryVersionKind;
  /** The chapter it was about, or null for the whole story. */
  chapterNumber: number | null;
  /** The staff member's username, shown only to staff. */
  changedByHandle: string | null;
  reasonCode: string;
  reasonText: string;
  /** The changed fields before and after, as the database stores them. */
  before: Record<string, Json | undefined>;
  after: Record<string, Json | undefined>;
  /** For a version made by Restore: the version it undid. */
  restoresVersionId: string | null;
  /** True while a removed passage's original words are kept and not put back. */
  passageKept: boolean;
}

/** A published chapter's words. */
export interface StaffChapterText {
  chapterId: string;
  number: number;
  title: string | null;
  text: string;
}

/** A removed passage's words. */
export interface RemovedPassage {
  text: string;
  caseReference: string | null;
  isPutBack: boolean;
}

/** The kinds the history knows; anything else reads as settings. */
const versionKinds: StaffStoryVersionKind[] = [
  'settings',
  'visibility',
  'chapter_visibility',
  'passage',
];

/**
 * Text, or null for anything that isn't text.
 *
 * @param value - a value from the answer
 * @returns the text or null
 */
function textOrNull(value: Json | undefined): string | null {
  return typeof value === 'string' ? value : null;
}

/**
 * Reads one version.
 *
 * @param version - one version from the answer
 * @returns the version
 */
function staffStoryVersionFrom(version: Record<string, Json | undefined>): StaffStoryVersion {
  const kind = versionKinds.find((known) => known === version['kind']) ?? 'settings';
  return {
    id: String(version['id']),
    at: String(version['at']),
    kind,
    chapterNumber: numberOrNull(version['chapter_number']),
    changedByHandle: textOrNull(version['changed_by_handle']),
    reasonCode: String(version['reason_code'] ?? 'other'),
    reasonText: String(version['reason_text'] ?? ''),
    before: objectOf(version['before']),
    after: objectOf(version['after']),
    restoresVersionId: textOrNull(version['restores_revision_id']),
    passageKept: version['passage_kept'] === true,
  };
}

/**
 * Reads the history from admin_story_overview().
 *
 * @param value - the history field, newest first
 * @returns the versions, newest first
 */
export function staffStoryHistoryFrom(value: Json | undefined): StaffStoryVersion[] {
  return listOf(value).map(staffStoryVersionFrom);
}

/**
 * Reads a published chapter's words.
 *
 * @param client - the shared Supabase client
 * @param chapterId - the chapter
 * @returns the words
 * @throws StoryChangeError (not_allowed, no_such_story, not_published or unreachable)
 */
export async function fetchStaffChapterText(
  client: AppSupabaseClient,
  chapterId: string,
): Promise<StaffChapterText> {
  const { data, error } = await client.rpc('admin_chapter_text', { target_chapter_id: chapterId });
  if (error !== null) throw storyChangeErrorFrom(error);
  const answer = objectOf(data);
  return {
    chapterId: String(answer['chapter_id']),
    number: numberOrNull(answer['number']) ?? 0,
    title: textOrNull(answer['title']),
    text: String(answer['text'] ?? ''),
  };
}

/**
 * Reads a removed passage's words. The database logs the read.
 *
 * @param client - the shared Supabase client
 * @param versionId - the version that removed it
 * @returns the words, the case they were removed for and whether they are back
 * @throws StoryChangeError (not_allowed, no_such_version or unreachable)
 */
export async function fetchRemovedPassage(
  client: AppSupabaseClient,
  versionId: string,
): Promise<RemovedPassage> {
  const { data, error } = await client.rpc('admin_removed_passage', {
    target_revision_id: versionId,
  });
  if (error !== null) throw storyChangeErrorFrom(error);
  const answer = objectOf(data);
  return {
    text: String(answer['text'] ?? ''),
    caseReference: textOrNull(answer['case_reference']),
    isPutBack: answer['put_back'] === true,
  };
}
