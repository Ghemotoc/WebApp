/**
 * The short line staff wrote under a genre or tag page's title (BOOKS-A06 and BOOKS-A09, user
 * stories 1.6 and 1.9; boards A06-ReadGenre "Maps, magic and long journeys." and A09-ReadTag).
 *
 * Who calls it: hooks/useListPageLine.ts, for StoryListHeader.
 * What it calls next: list_page_line(), which anyone may call: it returns only the line and the
 * language it is written in, never who wrote it.
 */
import { getSupabaseClient } from '@/lib/supabase';

/** The line, and the language it is written in (English when the page's language has none). */
export interface ListPageLine {
  line: string;
  language: string;
}

/**
 * Reads the line under a genre or tag page's title.
 *
 * @param listKind - 'category' or 'tag'
 * @param listKey - the slug or tag from the page address
 * @param pageLanguage - the language the page is shown in ('ro', 'en', …)
 * @returns the line, or null when staff wrote none (or the read failed: the page then shows no
 *   line, which is never wrong, only plainer)
 */
export async function fetchListPageLine(
  listKind: 'category' | 'tag',
  listKey: string,
  pageLanguage: string,
): Promise<ListPageLine | null> {
  const client = await getSupabaseClient();
  if (client === null) return null;
  const { data, error } = await client.rpc('list_page_line', {
    list_kind: listKind,
    list_key: listKey,
    page_language: pageLanguage,
  });
  if (error !== null || typeof data !== 'object' || data === null || Array.isArray(data)) {
    return null;
  }
  const { line, language } = data as Record<string, unknown>;
  if (typeof line !== 'string' || typeof language !== 'string') return null;
  return { line, language };
}
