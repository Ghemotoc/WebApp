/**
 * Adds, checks and publishes public-domain classics, for /staff/classics (story S1-E11-16, part
 * 16a; Robert, 25 Oct 2026, 07:15: pick or add the writer's name, the source and credit, then the
 * chapters).
 *
 * Who calls it: hooks/useClassics.ts.
 * What it calls next: the admin_* functions in …_s1_e11_16a_classic_works.sql. Each checks the
 * caller's role (owner and admin) and staff session itself, decides the public-domain check and
 * writes the audit log; this file only passes the answers on.
 */
import type { Enums } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** The kinds of work (the classic_kind enum). */
export type ClassicKind = Enums<'classic_kind'>;

/** Where a work is free today: Romania, the EU, the UK and the US (null: unknown). */
export interface FreeMarkets {
  RO: boolean;
  EU: boolean;
  UK: boolean;
  US: boolean | null;
}

/** One chapter as the staff page lists it (no text). */
export interface ClassicChapterSummary {
  title: string;
  wordCount: number;
  status: Enums<'chapter_status'>;
}

/** What staff type in the details form. Years are text, as the inputs hold them. */
export interface ClassicDetails {
  title: string;
  blurb: string;
  authorId: string;
  kind: ClassicKind;
  originalLanguage: string;
  languageCode: string;
  categorySlug: string;
  rating: Enums<'story_rating'>;
  contentNote: string;
  sourceTitle: string;
  sourceUrl: string;
  translatorName: string;
  translatorDiedYear: string;
  firstPublishedYear: string;
}

/** A new work's starting values: a Romanian novel for all ages in fiction. */
export const emptyClassicDetails: ClassicDetails = {
  title: '',
  blurb: '',
  authorId: '',
  kind: 'novel',
  originalLanguage: 'ro',
  languageCode: 'ro',
  categorySlug: 'fiction',
  rating: 'all_ages',
  contentNote: '',
  sourceTitle: '',
  sourceUrl: '',
  translatorName: '',
  translatorDiedYear: '',
  firstPublishedYear: '',
};

/** One classic on the staff page. */
export interface ClassicWork extends ClassicDetails {
  storyId: string;
  slug: string;
  authorName: string;
  authorDiedYear: number;
  freeMarkets: FreeMarkets;
  chapters: ClassicChapterSummary[];
  /** True once any chapter has been live: the text can then no longer be replaced. */
  wasPublished: boolean;
  updatedAt: string;
}

/** An author staff can pick. */
export interface ClassicAuthorChoice {
  id: string;
  name: string;
  diedYear: number;
}

/** One chapter to save, from the text preview (a type, so it fits the database's Json). */
export type ClassicChapterDraft = { title: string; body: string };

/** Why a call was refused, in words the page can explain (the database's hints). */
export const classicsFailures = [
  'not_allowed',
  'classics_account_missing',
  'details_invalid',
  'author_died_year_differs',
  'not_a_classic',
  'already_published',
  'no_chapters',
  'not_free_in_romania',
  'reason_missing',
  'refused',
  'unreachable',
] as const;
export type ClassicsFailure = (typeof classicsFailures)[number];

/** The error a refused call throws. */
export class ClassicsError extends Error {
  constructor(public readonly failure: ClassicsFailure) {
    super(`Classics call failed: ${failure}`);
  }
}

/**
 * Turns a database error into a reason: its hint when the page knows it, else by its code.
 *
 * @param error - Postgres's error (code and hint)
 * @returns the reason
 */
export function classicsFailureOf(error: { code?: string; hint?: string }): ClassicsFailure {
  const known = classicsFailures.find((failure) => failure === error.hint);
  if (known !== undefined) return known;
  if (error.code === '42501') return 'not_allowed';
  if (error.code === '23514' || error.code === '22P02') return 'refused';
  return 'unreachable';
}

/** The database's JSON for one work (classic_work_json()). */
interface ClassicWorkRow {
  story_id: string;
  slug: string;
  title: string;
  blurb: string;
  language_code: string;
  rating: Enums<'story_rating'>;
  content_note: string;
  category_slug: string;
  author: { id: string; name: string; died_year: number };
  kind: ClassicKind;
  original_language: string;
  source_title: string;
  source_url: string;
  translator_name: string | null;
  translator_died_year: number | null;
  first_published_year: number | null;
  free_markets: FreeMarkets;
  chapters: { title: string; word_count: number; status: Enums<'chapter_status'> }[];
  was_published: boolean;
  updated_at: string;
}

/**
 * The page's shape of one work.
 *
 * @param row - classic_work_json()
 * @returns the work
 */
function workFrom(row: ClassicWorkRow): ClassicWork {
  return {
    storyId: row.story_id,
    slug: row.slug,
    title: row.title,
    blurb: row.blurb,
    authorId: row.author.id,
    authorName: row.author.name,
    authorDiedYear: row.author.died_year,
    kind: row.kind,
    originalLanguage: row.original_language,
    languageCode: row.language_code,
    categorySlug: row.category_slug,
    rating: row.rating,
    contentNote: row.content_note,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    translatorName: row.translator_name ?? '',
    translatorDiedYear: row.translator_died_year === null ? '' : String(row.translator_died_year),
    firstPublishedYear: row.first_published_year === null ? '' : String(row.first_published_year),
    freeMarkets: row.free_markets,
    chapters: row.chapters.map((chapter) => ({
      title: chapter.title,
      wordCount: chapter.word_count,
      status: chapter.status,
    })),
    wasPublished: row.was_published,
    updatedAt: row.updated_at,
  };
}

/**
 * Calls one admin function and hands back its answer, or throws the reason it was refused.
 *
 * @param call - the Supabase rpc call
 * @returns the data
 * Errors: throws ClassicsError.
 */
async function answerOf<Data>(
  call: PromiseLike<{ data: Data | null; error: { code?: string; hint?: string } | null }>,
): Promise<Data> {
  const { data, error } = await call;
  if (error !== null) throw new ClassicsError(classicsFailureOf(error));
  if (data === null) throw new ClassicsError('unreachable');
  return data;
}

/**
 * Lists every classic, newest change first.
 *
 * @param client - the shared Supabase client
 * @returns the works
 * Errors: throws ClassicsError (not_allowed for anyone but owner and admin).
 */
export async function listClassics(client: AppSupabaseClient): Promise<ClassicWork[]> {
  const rows = await answerOf(client.rpc('admin_list_classics'));
  return (rows as unknown as ClassicWorkRow[]).map(workFrom);
}

/**
 * Lists the authors staff can pick, by name.
 *
 * @param client - the shared Supabase client
 * @returns the authors
 * Errors: throws ClassicsError.
 */
export async function listClassicAuthors(
  client: AppSupabaseClient,
): Promise<ClassicAuthorChoice[]> {
  const rows = await answerOf(client.rpc('admin_list_classic_authors'));
  return rows.map((row) => ({ id: row.id, name: row.name, diedYear: row.died_year }));
}

/**
 * Adds an author, or finds the one already listed under that name.
 *
 * @param client - the shared Supabase client
 * @param name - the name as the byline shows it
 * @param diedYear - the year they died
 * @returns the author's id
 * Errors: throws ClassicsError (author_died_year_differs when the name is listed with another year).
 */
export async function addClassicAuthor(
  client: AppSupabaseClient,
  name: string,
  diedYear: number,
): Promise<string> {
  return answerOf(client.rpc('admin_add_classic_author', { author_name: name, died: diedYear }));
}

/**
 * The details as the database reads them: blank optional years and the translator become null.
 *
 * @param details - the form's values
 * @returns the details JSON for admin_save_classic_work()
 */
export function detailsJson(details: ClassicDetails) {
  const yearOrNull = (text: string) => (text.trim() === '' ? null : Number(text));
  return {
    title: details.title.trim(),
    blurb: details.blurb.trim(),
    author_id: details.authorId,
    kind: details.kind,
    original_language: details.originalLanguage,
    language_code: details.languageCode,
    category_slug: details.categorySlug,
    rating: details.rating,
    content_note: details.contentNote.trim(),
    source_title: details.sourceTitle.trim(),
    source_url: details.sourceUrl.trim(),
    translator_name: details.translatorName.trim() === '' ? null : details.translatorName.trim(),
    translator_died_year: yearOrNull(details.translatorDiedYear),
    first_published_year: yearOrNull(details.firstPublishedYear),
  };
}

/**
 * Saves a new work as a draft, or changes an existing one's details.
 *
 * @param client - the shared Supabase client
 * @param storyId - the work's story id, or null for a new work
 * @param details - the form's values
 * @returns the saved work
 * Errors: throws ClassicsError.
 */
export async function saveClassicWork(
  client: AppSupabaseClient,
  storyId: string | null,
  details: ClassicDetails,
): Promise<ClassicWork> {
  const row = await answerOf(
    client.rpc('admin_save_classic_work', {
      details: detailsJson(details),
      target_story_id: storyId ?? undefined,
    }),
  );
  return workFrom(row as unknown as ClassicWorkRow);
}

/**
 * Replaces a work's chapters with the ones from the text preview (only before it is published).
 *
 * @param client - the shared Supabase client
 * @param storyId - the work's story id
 * @param chapters - the chapters in reading order
 * @returns the work
 * Errors: throws ClassicsError (already_published, no_chapters, refused for HTML or a long chapter).
 */
export async function setClassicChapters(
  client: AppSupabaseClient,
  storyId: string,
  chapters: ClassicChapterDraft[],
): Promise<ClassicWork> {
  const row = await answerOf(
    client.rpc('admin_set_classic_chapters', { target_story_id: storyId, chapter_list: chapters }),
  );
  return workFrom(row as unknown as ClassicWorkRow);
}

/**
 * Publishes every chapter of a work, if it is free in Romania.
 *
 * @param client - the shared Supabase client
 * @param storyId - the work's story id
 * @returns the work
 * Errors: throws ClassicsError (not_free_in_romania, no_chapters).
 */
export async function publishClassic(
  client: AppSupabaseClient,
  storyId: string,
): Promise<ClassicWork> {
  const row = await answerOf(client.rpc('admin_publish_classic', { target_story_id: storyId }));
  return workFrom(row as unknown as ClassicWorkRow);
}

/**
 * Takes a work off the site at once, with a reason for the audit log.
 *
 * @param client - the shared Supabase client
 * @param storyId - the work's story id
 * @param reason - why
 * @returns the work
 * Errors: throws ClassicsError (reason_missing).
 */
export async function unpublishClassic(
  client: AppSupabaseClient,
  storyId: string,
  reason: string,
): Promise<ClassicWork> {
  const row = await answerOf(
    client.rpc('admin_unpublish_classic', { target_story_id: storyId, reason_given: reason }),
  );
  return workFrom(row as unknown as ClassicWorkRow);
}
