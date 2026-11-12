/**
 * The WebsiteContentStore: the one way the app reads and writes website content (stories
 * S1-E11-06, S1-E11-10 and S1-E11-12; architecture 1.8.6, B31).
 *
 * Who calls it: the public home page, the notice strip and Help (through hooks/useWebsiteContent.ts)
 * use appDatabaseReader() here; the staff editors (through hooks/useWebsiteEditor.ts) use the
 * staff half, api/staff/websiteContentEditor.ts (QA-5: staff calls stay out of the reader's
 * download). This file also holds the shared types and errors.
 * What it calls next: for March the only store uses the app's own database: website_content()
 * for visitors, the cms_versions table for staff (RLS lets only owner and admin read it) and the
 * admin_*_cms_* functions in …_s1_e11_06_website_cms.sql, which check the role and write the
 * audit log. When the website gets its own database (set-up OPEN), a
 * second store with the same interface writes there and nothing that uses the store changes
 * (decided 17 Oct 2026, 19:16).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { WebsiteContentKind } from '@/schemas/websiteContent';

/** Why a store action failed, for the page's message. */
export type WebsiteContentFailure = 'not_allowed' | 'invalid' | 'not_found' | 'unreachable';

/** One field the database refused: its name ("lede", "points.1") and the problem ("too_long"). */
export interface FieldProblem {
  field: string;
  problem: string;
  /** For a broken link, the address that goes nowhere. */
  detail: string | null;
}

/** A failed store action, with the fields to fix when the database listed them. */
export class WebsiteContentError extends Error {
  readonly failure: WebsiteContentFailure;
  readonly problems: FieldProblem[];
  /** A single reason word from the database ("home_page_stays"), or null. */
  readonly reason: string | null;

  constructor(
    failure: WebsiteContentFailure,
    message: string,
    problems: FieldProblem[],
    reason: string | null,
  ) {
    super(message);
    this.failure = failure;
    this.problems = problems;
    this.reason = reason;
  }
}

/**
 * Reads the database's list of fields to fix ("lede:too_long,body:broken_link:/help/x").
 *
 * @param hint - the error's hint
 * @returns the problems, or an empty list when the hint isn't a list of fields
 */
export function fieldProblemsFrom(hint: string | undefined): FieldProblem[] {
  if (hint === undefined || !hint.includes(':')) return [];
  return hint.split(',').map((item) => {
    const [field = '', problem = '', ...rest] = item.split(':');
    return { field, problem, detail: rest.length > 0 ? rest.join(':') : null };
  });
}

/**
 * Turns a database error into a WebsiteContentError.
 *
 * @param error - the error Supabase answered
 * @returns the matching error
 */
export function websiteErrorFrom(error: {
  code?: string;
  message: string;
  hint?: string;
}): WebsiteContentError {
  const failureByCode: Record<string, WebsiteContentFailure> = {
    '42501': 'not_allowed',
    '23514': 'invalid',
    P0002: 'not_found',
  };
  const failure = failureByCode[error.code ?? ''] ?? 'unreachable';
  const problems = fieldProblemsFrom(error.hint);
  const reason =
    problems.length === 0 && error.hint !== undefined && error.hint !== '' ? error.hint : null;
  return new WebsiteContentError(failure, error.message, problems, reason);
}

/**
 * The country code that means "every country": the shared page (LOCALISE-1). The database stores
 * it as no country at all (null); the editors and pages use this empty text instead, so a
 * country is always a string.
 */
export const everyCountry = '';

/** What a visitor sees of one entry, before its content is parsed. */
export interface LiveEntry {
  entryKey: string;
  /** The country this wording is for; everyCountry for the shared page. */
  marketCode: string;
  /** The language chosen for the visitor, after the fallbacks. */
  languageCode: string;
  content: unknown;
  showFrom: string;
  showUntil: string | null;
}

/** Who is looking: the country from the connection and the interface language. */
export interface Visitor {
  country: string | null;
  language: string;
}

/** One stored version, as the editors see it. */
export interface ContentVersion {
  id: string;
  kind: WebsiteContentKind;
  entryKey: string;
  /** The country this wording is for; everyCountry for the shared page. */
  marketCode: string;
  languageCode: string | null;
  content: unknown;
  status: 'draft' | 'published';
  isRemoval: boolean;
  showFrom: string | null;
  showUntil: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** What the editors send to save a draft. */
export interface DraftInput {
  kind: WebsiteContentKind;
  entryKey: string;
  marketCode: string;
  /** Null for a notice, which holds every language of its market. */
  languageCode: string | null;
  content: Json;
  showFrom: string | null;
  showUntil: string | null;
}

/** Where an entry lives, for removing it. */
export interface EntryPlace {
  kind: WebsiteContentKind;
  entryKey: string;
  marketCode: string;
  languageCode: string | null;
}

/** What the public pages need: the live content (architecture 1.8.6). */
export interface WebsiteContentReader {
  /** What a visitor sees of one kind: their language before English, their country's wording
   * before the shared page (LOCALISE-1). */
  readLive(kind: WebsiteContentKind, visitor: Visitor): Promise<LiveEntry[]>;
}

/** What the staff editors need (owner and admin only; api/staff/websiteContentEditor.ts). */
export interface WebsiteContentEditor {
  /** Every version of one kind for one country, or of the shared pages for everyCountry (staff). */
  listVersions(kind: WebsiteContentKind, marketCode: string): Promise<ContentVersion[]>;
  /** Saves the entry's draft; returns its id. */
  saveDraft(draft: DraftInput): Promise<string>;
  /** Publishes a draft; returns the day it goes live. */
  publish(versionId: string): Promise<string>;
  /** Brings an earlier version back as the draft; returns the draft's id. */
  restore(versionId: string): Promise<string>;
  /** Takes an entry down from today. */
  remove(place: EntryPlace): Promise<void>;
}

/**
 * The contract every store keeps (architecture 1.8.6): the reader and the editor together. They
 * are two halves so the reader's download never carries the staff calls (QA-5, finding R5).
 */
export type WebsiteContentStore = WebsiteContentReader & WebsiteContentEditor;

/** A website_content() row as the database gives it. */
interface LiveRow {
  entry_key: string;
  /** Null for the shared page (LOCALISE-1). */
  market_code: string | null;
  language_code: string;
  content: Json;
  show_from: string;
  show_until: string | null;
}

/**
 * Shapes one live row for the public pages.
 *
 * @param row - the row website_content() returned
 * @returns the entry, its content not yet parsed
 */
function liveEntryFromRow(row: LiveRow): LiveEntry {
  return {
    entryKey: row.entry_key,
    marketCode: row.market_code ?? everyCountry,
    languageCode: row.language_code,
    content: row.content,
    showFrom: row.show_from,
    showUntil: row.show_until,
  };
}

/**
 * The public half of the store for March: website_content() in the app's own database.
 *
 * @param client - the shared Supabase client
 * @returns the reader
 */
export function appDatabaseReader(client: AppSupabaseClient): WebsiteContentReader {
  return {
    async readLive(kind, visitor) {
      const { data, error } = await client.rpc('website_content', {
        wanted_kind: kind,
        visitor_country: visitor.country ?? undefined,
        wanted_language: visitor.language,
      });
      if (error !== null) throw websiteErrorFrom(error);
      return data.map(liveEntryFromRow);
    },
  };
}
