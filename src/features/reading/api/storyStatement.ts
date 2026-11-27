/**
 * What the story footer says about a story (CALM-9s; Robert's canvas comments of 23 Nov 2026,
 * boards B01 to B06).
 *
 * Who calls it: hooks/useStoryStatement.ts, for the story page and the reader.
 * What it calls next: get_link_preview(story_slug), the same function that fills the page's search
 * tags and its text before the app starts (server/link-preview.ts), so the footer, the description
 * and the JSON-LD say the same thing. Never the user ID, an age or chapter text.
 */
import type { StoryStatementFacts } from '@/lib/story-statement';
import type { AppSupabaseClient } from '@/lib/supabase';

/** A story's statement, as the footer draws it. */
export interface StoryStatement {
  facts: StoryStatementFacts;
  /** The story's blurb, or an empty text. */
  blurb: string;
  /** The writer's username for the profile link; null for a classic's author. */
  writerHandle: string | null;
}

/** The part of get_link_preview()'s JSON this module reads. */
interface StatementRow {
  title: string;
  rating: string;
  language_code: string;
  is_listed: boolean;
  is_app_only?: boolean;
  blurb: string | null;
  writer: { display_name: string; handle?: string | null } | null;
  category_slug: string | null;
  genre?: string | null;
}

/**
 * Turns the database's answer into the footer's statement, or null when the footer keeps the
 * site's own words: an unlisted or app-only story, or one without a writer (CALM-9s: the same
 * rule as the page's search tags, carriesStatement() on the server). A story hidden in some
 * countries carries it, as its book page stays in search (COUNTRY-2, Robert, 27 Nov 2026).
 *
 * @param row - what get_link_preview() answered
 * @returns the statement, or null
 */
export function statementFromRow(row: StatementRow): StoryStatement | null {
  if (!row.is_listed || row.is_app_only === true) return null;
  if (row.writer === null) return null;
  return {
    facts: {
      title: row.title,
      categorySlug: row.category_slug,
      genre: row.genre ?? null,
      writerName: row.writer.display_name,
      languageCode: row.language_code,
      // Robert, 11 Nov 2026: only 18+ says so, and never the rating itself.
      isMature: row.rating === '18_plus',
    },
    blurb: row.blurb ?? '',
    writerHandle: row.writer.handle ?? null,
  };
}

/**
 * Reads a story's statement.
 *
 * @param client - the shared Supabase client
 * @param storySlug - the story's public address
 * @returns the statement, or null when there is none to show
 * Errors: throws with Supabase's message when the database can't be reached.
 */
export async function fetchStoryStatement(
  client: AppSupabaseClient,
  storySlug: string,
): Promise<StoryStatement | null> {
  const { data, error } = await client.rpc('get_link_preview', { story_slug: storySlug });
  if (error !== null) throw new Error(`Could not read the story's statement: ${error.message}`);
  if (data === null) return null;
  return statementFromRow(data as unknown as StatementRow);
}
