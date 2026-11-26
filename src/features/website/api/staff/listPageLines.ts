/**
 * Staff › Website › Genre and tag pages, "Lines under the title": read and change the short line
 * under each genre and tag page's title, one per language (BOOKS-A06 and BOOKS-A09, user stories
 * 1.6 and 1.9; boards A06-ReadGenre and A09-ReadTag).
 *
 * Who calls it: hooks/useListPageLines.ts.
 * What it calls next: admin_list_page_lines() and admin_set_list_page_line(), which check the
 * owner or admin role and write the audit log in the same transaction.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The longest line the database takes (list_page_lines_length). */
export const longestPageLine = 200;

/** One saved line. */
export interface ListPageLine {
  kind: 'category' | 'tag';
  /** The category slug, or the tag's name. */
  key: string;
  /** The language code the line is written in ('ro', 'en', …). */
  language: string;
  line: string;
  /** The username of the admin who wrote it, or null if the account is gone. */
  setBy: string | null;
  updatedAt: string;
}

/** Which page and language a change is for. */
export interface PageLinePlace {
  kind: 'category' | 'tag';
  key: string;
  language: string;
}

/** Why a change failed, for the page's message. */
export type PageLineFailure =
  'not_allowed' | 'no_list' | 'no_language' | 'too_long' | 'unreachable';

/** A failed change, with the word the page shows. */
export class PageLineSaveError extends Error {
  readonly failure: PageLineFailure;

  constructor(failure: PageLineFailure, message: string) {
    super(message);
    this.failure = failure;
  }
}

/** The hints admin_set_list_page_line() raises, each with its own message on the page. */
const knownHints: readonly PageLineFailure[] = ['no_list', 'no_language', 'too_long'];

/**
 * Turns a database error into a failure the page can word.
 *
 * @param error - the error Supabase answered
 * @returns the matching PageLineSaveError
 */
function pageLineErrorFrom(error: { code?: string; message: string; hint?: string }) {
  if (error.code === '42501') return new PageLineSaveError('not_allowed', error.message);
  const hinted = knownHints.find((hint) => hint === error.hint);
  if (hinted !== undefined) return new PageLineSaveError(hinted, error.message);
  return new PageLineSaveError('unreachable', error.message);
}

/**
 * Reads one row of the staff list into its typed shape, or null for a row it can't read.
 *
 * @param row - one element of admin_list_page_lines()
 * @returns the line, or null
 */
function pageLineFrom(row: unknown): ListPageLine | null {
  if (typeof row !== 'object' || row === null) return null;
  const value = row as Record<string, unknown>;
  if (value.kind !== 'category' && value.kind !== 'tag') return null;
  if (typeof value.line !== 'string' || typeof value.language !== 'string') return null;
  return {
    kind: value.kind,
    key: String(value.key ?? ''),
    language: value.language,
    line: value.line,
    setBy: typeof value.set_by === 'string' ? value.set_by : null,
    updatedAt: String(value.updated_at ?? ''),
  };
}

/**
 * Reads every saved line.
 *
 * @param client - the signed-in Supabase client
 * @returns the lines, genres first, then tags by name
 * @throws PageLineSaveError when the read is refused or fails
 */
export async function fetchListPageLines(client: AppSupabaseClient): Promise<ListPageLine[]> {
  const { data, error } = await client.rpc('admin_list_page_lines');
  if (error !== null) throw pageLineErrorFrom(error);
  const rows = Array.isArray(data) ? data : [];
  return rows.map(pageLineFrom).filter((row): row is ListPageLine => row !== null);
}

/**
 * Writes, changes or clears a page's line in one language. An empty line clears it.
 *
 * @param client - the signed-in Supabase client
 * @param place - the page and language
 * @param line - the sentence, or '' to clear
 * @throws PageLineSaveError when refused
 */
export async function saveListPageLine(
  client: AppSupabaseClient,
  place: PageLinePlace,
  line: string,
): Promise<void> {
  const { error } = await client.rpc('admin_set_list_page_line', {
    list_kind: place.kind,
    list_key: place.key,
    line_language: place.language,
    new_line: line,
  });
  if (error !== null) throw pageLineErrorFrom(error);
}
