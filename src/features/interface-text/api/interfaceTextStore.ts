/**
 * The interface text store: reads and writes admin overrides of the app's interface and email text
 * (stories S1-E11-18 and S1-E11-19; architecture 1.8.6, B34).
 *
 * Who calls it: hooks/useInterfaceTextEditor.ts.
 * What it calls next: the interface_text_overrides table (owner and admin read it through RLS) and
 * the admin_*_interface_text functions in …_s1_e11_18_interface_text.sql, which check the role and
 * write the audit log. Errors are turned into the website editors' error (the same field list in
 * the hint), so the shared feedback shows them.
 */
import { brand } from '@/config/brand';
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { AppSupabaseClient } from '@/lib/supabase';

import { placeholdersOf } from '../lib/localeCatalogue';

/** One stored version of a key in one locale. */
export interface TextVersion {
  id: string;
  textKey: string;
  locale: string;
  text: string;
  status: 'draft' | 'published';
  isReset: boolean;
  showFrom: string | null;
  publishedAt: string | null;
  updatedAt: string;
}

/** What the editor sends to save a draft. */
export interface TextDraft {
  textKey: string;
  locale: string;
  text: string;
  /** The file text it replaces: its placeholders must stay (criterion 8). */
  fileText: string;
  showFrom: string | null;
}

/** The columns the editor reads. */
const versionColumns =
  'id, text_key, locale, text, status, is_reset, show_from, published_at, updated_at';

/** A table row as the database gives it. */
interface VersionRow {
  id: string;
  text_key: string;
  locale: string;
  text: string;
  status: string;
  is_reset: boolean;
  show_from: string | null;
  published_at: string | null;
  updated_at: string;
}

/**
 * Shapes one row for the editor.
 *
 * @param row - the row
 * @returns the version
 */
function versionFromRow(row: VersionRow): TextVersion {
  return {
    id: row.id,
    textKey: row.text_key,
    locale: row.locale,
    text: row.text,
    status: row.status === 'draft' ? 'draft' : 'published',
    isReset: row.is_reset,
    showFrom: row.show_from,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Every version of one key, newest first (staff).
 *
 * @param client - the shared client
 * @param textKey - "common:nav.help"
 * @returns the versions in every locale
 */
export async function listTextVersions(
  client: AppSupabaseClient,
  textKey: string,
): Promise<TextVersion[]> {
  const { data, error } = await client
    .from('interface_text_overrides')
    .select(versionColumns)
    .eq('text_key', textKey)
    .order('updated_at', { ascending: false });
  if (error !== null) throw websiteErrorFrom(error);
  return data.map(versionFromRow);
}

/**
 * Saves the draft of a key in a locale.
 *
 * @param client - the shared client
 * @param draft - the text, its file text and the "show from" date
 * @returns the draft's id
 * Errors: a WebsiteContentError naming the problem (empty, placeholders changed, a brand name).
 */
export async function saveTextDraft(client: AppSupabaseClient, draft: TextDraft): Promise<string> {
  const { data, error } = await client.rpc('admin_save_interface_text', {
    text_key: draft.textKey,
    locale: draft.locale,
    new_text: draft.text,
    file_placeholders: placeholdersOf(draft.fileText),
    // The brand names must be written as {{productName}} and {{companyName}} (decided 17 Oct 2026, 12:47).
    brand_names: [brand.productName, brand.companyName],
    new_show_from: draft.showFrom ?? undefined,
  });
  if (error !== null) throw websiteErrorFrom(error);
  return data;
}

/**
 * Publishes a draft.
 *
 * @returns the day it goes live
 */
export async function publishText(client: AppSupabaseClient, versionId: string): Promise<string> {
  const { data, error } = await client.rpc('admin_publish_interface_text', {
    version_id: versionId,
  });
  if (error !== null) throw websiteErrorFrom(error);
  return data;
}

/**
 * Brings an earlier version back as the draft.
 *
 * @returns the draft's id
 */
export async function restoreText(client: AppSupabaseClient, versionId: string): Promise<string> {
  const { data, error } = await client.rpc('admin_restore_interface_text', {
    version_id: versionId,
  });
  if (error !== null) throw websiteErrorFrom(error);
  return data;
}

/**
 * Brings the file text back from today ("Reset to default").
 */
export async function resetText(
  client: AppSupabaseClient,
  textKey: string,
  locale: string,
): Promise<void> {
  const { error } = await client.rpc('admin_reset_interface_text', { text_key: textKey, locale });
  if (error !== null) throw websiteErrorFrom(error);
}
