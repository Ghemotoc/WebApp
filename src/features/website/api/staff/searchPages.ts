/**
 * Staff › Website › Search and sharing: reads every public page's live version and turns each
 * into what search results and share cards will show (story S1-E11-39; bundle SEO-1d).
 *
 * Who calls it: hooks/useSearchPages.ts.
 * What it calls next: admin_search_pages(), which refuses anyone without the website area, then
 * lib/searchPageReport.ts for each row.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { searchPageReportOf, type SearchPageReport } from '../../lib/searchPageReport';

/** Why reading failed, for the page's message. */
export type SearchPagesFailure = 'not_allowed' | 'unreachable';

/** A failed read, with the word the page shows. */
export class SearchPagesError extends Error {
  readonly failure: SearchPagesFailure;

  constructor(failure: SearchPagesFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/**
 * Reads every public page with search and share tags.
 *
 * @param client - the signed-in Supabase client
 * @returns the pages, in the order the database lists them (kind, address, market, language)
 * @throws SearchPagesError('not_allowed') for staff without the website area,
 *   SearchPagesError('unreachable') when the read fails for any other reason
 */
export async function fetchSearchPages(client: AppSupabaseClient): Promise<SearchPageReport[]> {
  // Step 1: the live versions; the database checks the area (42501 when refused).
  const { data, error } = await client.rpc('admin_search_pages');
  if (error !== null) {
    const failure = error.code === '42501' ? 'not_allowed' : 'unreachable';
    throw new SearchPagesError(failure, error.message);
  }
  // Step 2: each row becomes what the screen shows; an unknown kind is left out.
  return data.flatMap((row) => {
    const report = searchPageReportOf(row);
    return report === null ? [] : [report];
  });
}
