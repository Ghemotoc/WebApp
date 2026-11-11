/**
 * What a visitor who isn't logged in may know about a story they can't open (story S1-E4-04).
 *
 * Who calls it: hooks/useStoryPreview.ts, for the "No preview for this story" notice on the
 * reader and the story page.
 * What it calls next: get_link_preview(story_slug, chapter_code), the same function that fills a
 * shared link's Open Graph tags (server/link-preview.ts). Every story gives the same details, the
 * title, blurb and writer's name (S1-E11-36, Robert, 11 Nov 2026); for 16+ and 18+ it says the
 * text is hidden, because signed-out visitors count as under 16 (decided 23 Oct 2026, Q6).
 * Never the user ID and never chapter text.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The ratings that hide a story's text from visitors who aren't logged in. */
export type HiddenRating = '16_plus' | '18_plus';

/** A story a signed-out visitor can't read, as the notice shows it. */
export interface HiddenStoryPreview {
  title: string;
  rating: HiddenRating;
  languageCode: string;
  /** The story's blurb, or an empty text. */
  blurb: string;
  /** The writer's pen name or username, or null. */
  writerName: string | null;
}

/** The part of get_link_preview()'s JSON this module reads. */
interface PreviewRow {
  title: string;
  rating: string;
  language_code: string;
  hides_text: boolean;
  blurb: string | null;
  writer: { display_name: string } | null;
}

/**
 * Reads a story's public preview and keeps it only when its rating hides the text.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @param chapterCode - the chapter's code, or null for the story page
 * @returns the title, rating, blurb and writer of a 16+ or 18+ story; null for anything else (an unknown
 *   address, or a story the visitor could open, which the caller treats as "not available")
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchHiddenStoryPreview(
  client: AppSupabaseClient,
  storySlug: string,
  chapterCode: string | null,
): Promise<HiddenStoryPreview | null> {
  const { data, error } = await client.rpc('get_link_preview', {
    story_slug: storySlug,
    // The generated types mark the default argument optional; leave it out for the story page.
    ...(chapterCode === null ? {} : { chapter_code: chapterCode }),
  });
  if (error !== null) throw new Error(`Could not read the story's preview: ${error.message}`);
  if (data === null) return null;
  const row = data as unknown as PreviewRow;
  if (!row.hides_text) return null;
  if (row.rating !== '16_plus' && row.rating !== '18_plus') return null;
  return {
    title: row.title,
    rating: row.rating,
    languageCode: row.language_code,
    blurb: row.blurb ?? '',
    writerName: row.writer?.display_name ?? null,
  };
}
