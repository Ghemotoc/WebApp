/**
 * Importing the research lists, the 1 January suggestions and typo fixes, for /staff/classics
 * (story S1-E11-16, part 16b).
 *
 * Who calls it: hooks/useClassicsImport.ts and hooks/useClassicTypoFix.ts.
 * What it calls next: the admin_* functions in …_s1_e5_06_classics_shelf.sql. Each checks the
 * caller's role (owner and admin) and staff session itself and writes the audit log; this file
 * only passes the answers on.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { answerOf } from './classics';

/** One row of a research list, with the columns of content/classics/*.csv the import reads. */
export type ClassicListRow = {
  title: string;
  author: string;
  author_died: string;
  type: string;
  language: string;
  source_url: string;
};

/** One row the import refused: its line (counted from 1 after the header) and why. */
export interface RefusedListRow {
  line: number;
  title: string;
  reason: string;
}

/** What an import did. */
export interface ImportResult {
  added: number;
  alreadyListed: number;
  refused: RefusedListRow[];
}

/** One work of a suggested author. */
export interface SuggestedWork {
  storyId: string;
  title: string;
  isPublished: boolean;
}

/** An author whose works become free on 1 January. */
export interface SuggestedAuthor {
  name: string;
  diedYear: number;
  works: SuggestedWork[];
}

/** The 1 January suggestions. */
export interface ClassicSuggestions {
  year: number;
  freeThisYear: SuggestedAuthor[];
  freeNextYear: SuggestedAuthor[];
}

/** A live classic chapter, for the typo fix form. */
export interface LiveClassicChapter {
  code: string;
  title: string;
  body: string;
  /** How many typo fixes it has had (each kept as a version). */
  fixes: number;
}

/** The database's JSON for one suggested author. */
interface SuggestedAuthorRow {
  name: string;
  died_year: number;
  works: { story_id: string; title: string; is_published: boolean }[];
}

/**
 * The page's shape of one suggested author.
 *
 * @param row - from classic_authors_dying_in()
 * @returns the author
 */
function authorFrom(row: SuggestedAuthorRow): SuggestedAuthor {
  return {
    name: row.name,
    diedYear: row.died_year,
    works: row.works.map((work) => ({
      storyId: work.story_id,
      title: work.title,
      isPublished: work.is_published,
    })),
  };
}

/**
 * Turns a research list's rows into draft works.
 *
 * @param client - the shared Supabase client
 * @param rows - the rows, as parseClassicsCsv() read them
 * @returns how many were added, already listed or refused (with the line and the reason)
 * Errors: throws ClassicsError (not_allowed, too_many_rows).
 */
export async function importClassics(
  client: AppSupabaseClient,
  rows: ClassicListRow[],
): Promise<ImportResult> {
  const answer = (await answerOf(
    client.rpc('admin_import_classics', { list_rows: rows }),
  )) as unknown as {
    added: number;
    already_listed: number;
    refused: RefusedListRow[];
  };
  return { added: answer.added, alreadyListed: answer.already_listed, refused: answer.refused };
}

/**
 * Reads the authors whose works became free on 1 January, and next year's.
 *
 * @param client - the shared Supabase client
 * @returns the suggestions
 * Errors: throws ClassicsError (not_allowed).
 */
export async function fetchClassicSuggestions(
  client: AppSupabaseClient,
): Promise<ClassicSuggestions> {
  const answer = (await answerOf(client.rpc('admin_classic_suggestions'))) as unknown as {
    year: number;
    free_this_year: SuggestedAuthorRow[];
    free_next_year: SuggestedAuthorRow[];
  };
  return {
    year: answer.year,
    freeThisYear: answer.free_this_year.map(authorFrom),
    freeNextYear: answer.free_next_year.map(authorFrom),
  };
}

/**
 * Reads one live classic chapter's text.
 *
 * @param client - the shared Supabase client
 * @param chapterCode - the chapter's code
 * @returns the chapter
 * Errors: throws ClassicsError (not_a_classic).
 */
export async function fetchLiveClassicChapter(
  client: AppSupabaseClient,
  chapterCode: string,
): Promise<LiveClassicChapter> {
  const answer = await answerOf(
    client.rpc('admin_classic_chapter', { target_chapter_code: chapterCode }),
  );
  return answer as unknown as LiveClassicChapter;
}

/**
 * Corrects a typo in a live classic chapter; the old text stays as a version.
 *
 * @param client - the shared Supabase client
 * @param chapterCode - the chapter's code
 * @param correctedBody - the whole chapter with the typo fixed
 * @param reason - why, for the audit log
 * @returns the chapter after the fix
 * Errors: throws ClassicsError (reason_missing, no_change, too_big, refused).
 */
export async function fixClassicTypo(
  client: AppSupabaseClient,
  chapterCode: string,
  correctedBody: string,
  reason: string,
): Promise<LiveClassicChapter> {
  const answer = await answerOf(
    client.rpc('admin_fix_classic_typo', {
      target_chapter_code: chapterCode,
      corrected_body: correctedBody,
      reason_given: reason,
    }),
  );
  return answer as unknown as LiveClassicChapter;
}
