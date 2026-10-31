/**
 * The music or video card an embed case is about, for the case page (story S1-E3-10 criterion 4).
 *
 * Who calls it: hooks/useCaseEmbed.ts (CaseEmbedPanel).
 * What it calls next: admin_case_embed() (…_s1_e3_10_music_and_video.sql), which checks the
 * caller may see the case. Nothing loads from the service here: the moderator gets the writer's
 * link and decides whether to open it.
 */
import type { Json } from '@/lib/database.types';
import { isEmbedService, type EmbedService } from '@/lib/embed-links';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** The card, as the case page shows it. */
export interface CaseEmbed {
  service: EmbedService;
  /** The writer's link in its clean form (src/lib/embed-links.ts). */
  sourceUrl: string;
  title: string | null;
  authorName: string | null;
  /** The chapter it sits in, for the link to it. */
  story: { slug: string; title: string };
  chapterCode: string;
}

/**
 * A text from the answer, or null.
 *
 * @returns the text when it is a string
 */
function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * Reads the card of an embed case.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case's ID
 * @returns the card, or null when the case isn't about one
 * @throws ModerationError when the caller may not see the case or the database can't be reached
 */
export async function fetchCaseEmbed(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseEmbed | null> {
  const { data, error } = await client.rpc('admin_case_embed', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  return caseEmbedFrom(data);
}

/**
 * The story part of the answer, as a record (empty when it is missing).
 *
 * @returns the story's fields
 */
function storyOf(story: Json | undefined): Record<string, Json | undefined> {
  if (story === null || story === undefined) return {};
  if (typeof story !== 'object' || Array.isArray(story)) return {};
  return story;
}

/**
 * The card from admin_case_embed()'s JSON.
 *
 * @returns the card, or null for anything that isn't one
 */
function caseEmbedFrom(data: Json): CaseEmbed | null {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return null;
  if (!isEmbedService(data.service)) return null;
  const storyRecord = storyOf(data.story);
  return {
    service: data.service,
    sourceUrl: textOf(data, 'source_url') ?? '',
    title: textOf(data, 'title'),
    authorName: textOf(data, 'author_name'),
    story: { slug: textOf(storyRecord, 'slug') ?? '', title: textOf(storyRecord, 'title') ?? '' },
    chapterCode: textOf(data, 'chapter_code') ?? '',
  };
}
