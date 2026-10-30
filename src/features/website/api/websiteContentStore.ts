/**
 * The WebsiteContentStore: the one way the app reads and writes website content (stories
 * S1-E11-06, S1-E11-10 and S1-E11-12; architecture 1.8.6, B31).
 *
 * Who calls it: the public home page, the notice strip and Help (through hooks/useWebsiteContent.ts)
 * and the staff editors (through hooks/useWebsiteEditor.ts).
 * What it calls next: for March the only store is appDatabaseStore(), which uses the app's own
 * database: website_content() for visitors, the cms_versions table for staff (RLS lets only owner
 * and admin read it) and the admin_*_cms_* functions in …_s1_e11_06_website_cms.sql, which check
 * the role and write the audit log. When the website gets its own database (set-up OPEN), a
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

/** What a visitor sees of one entry, before its content is parsed. */
export interface LiveEntry {
  entryKey: string;
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

/** The contract every store keeps (architecture 1.8.6). */
export interface WebsiteContentStore {
  /** What a visitor sees of one kind, with the market and language fallbacks. */
  readLive(kind: WebsiteContentKind, visitor: Visitor): Promise<LiveEntry[]>;
  /** Every version of one kind in one market (staff). */
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

/** A cms_versions row as the table gives it. */
interface VersionRow {
  id: string;
  content_kind: string;
  entry_key: string;
  market_code: string;
  language_code: string | null;
  content: Json;
  status: string;
  is_removal: boolean;
  show_from: string | null;
  show_until: string | null;
  published_at: string | null;
  updated_at: string;
}

/**
 * Shapes one table row for the editors.
 *
 * @param row - the row
 * @returns the version
 */
function versionFromRow(row: VersionRow): ContentVersion {
  return {
    id: row.id,
    kind: row.content_kind as WebsiteContentKind,
    entryKey: row.entry_key,
    marketCode: row.market_code,
    languageCode: row.language_code,
    content: row.content,
    status: row.status === 'draft' ? 'draft' : 'published',
    isRemoval: row.is_removal,
    showFrom: row.show_from,
    showUntil: row.show_until,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/** A website_content() row as the database gives it. */
interface LiveRow {
  entry_key: string;
  market_code: string;
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
    marketCode: row.market_code,
    languageCode: row.language_code,
    content: row.content,
    showFrom: row.show_from,
    showUntil: row.show_until,
  };
}

/** The cms_versions columns the editors read. */
const versionColumns =
  'id, content_kind, entry_key, market_code, language_code, content, status, is_removal, show_from, show_until, published_at, updated_at';

/**
 * The store for March: the CMS tables in the app's own database.
 *
 * @param client - the shared Supabase client
 * @returns the store
 */
export function appDatabaseStore(client: AppSupabaseClient): WebsiteContentStore {
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
    async listVersions(kind, marketCode) {
      const { data, error } = await client
        .from('cms_versions')
        .select(versionColumns)
        .eq('content_kind', kind)
        .eq('market_code', marketCode)
        .order('updated_at', { ascending: false });
      if (error !== null) throw websiteErrorFrom(error);
      return data.map(versionFromRow);
    },
    async saveDraft(draft) {
      const { data, error } = await client.rpc('admin_save_cms_draft', {
        content_kind: draft.kind,
        entry_key: draft.entryKey,
        market_code: draft.marketCode,
        // The database reads an empty language as none: a notice holds every language.
        language_code: draft.languageCode ?? '',
        new_content: draft.content,
        new_show_from: draft.showFrom ?? undefined,
        new_show_until: draft.showUntil ?? undefined,
      });
      if (error !== null) throw websiteErrorFrom(error);
      return data;
    },
    async publish(versionId) {
      const { data, error } = await client.rpc('admin_publish_cms_version', {
        version_id: versionId,
      });
      if (error !== null) throw websiteErrorFrom(error);
      return data;
    },
    async restore(versionId) {
      const { data, error } = await client.rpc('admin_restore_cms_version', {
        version_id: versionId,
      });
      if (error !== null) throw websiteErrorFrom(error);
      return data;
    },
    async remove(place) {
      const { error } = await client.rpc('admin_remove_cms_entry', {
        content_kind: place.kind,
        entry_key: place.entryKey,
        market_code: place.marketCode,
        language_code: place.languageCode ?? '',
      });
      if (error !== null) throw websiteErrorFrom(error);
    },
  };
}
