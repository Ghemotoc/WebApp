/**
 * The staff half of the WebsiteContentStore: the CMS editors' reads and writes (stories S1-E11-06,
 * S1-E11-10 and S1-E11-12; architecture 1.8.6, B31). Split from ../websiteContentStore.ts by QA-5
 * (finding R5), so the public pages' download never carries these calls.
 *
 * Who calls it: hooks/useWebsiteEditor.ts, on the staff Website pages.
 * What it calls next: the cms_versions table (RLS lets only owner and admin read it) and the
 * admin_*_cms_* functions, which check the role and is_staff_session() and write the audit log.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import type { WebsiteContentKind } from '@/schemas/websiteContent';

import {
  appDatabaseReader,
  everyCountry,
  websiteErrorFrom,
  type ContentVersion,
  type WebsiteContentEditor,
  type WebsiteContentStore,
} from '../websiteContentStore';

/** A cms_versions row as the table gives it. */
interface VersionRow {
  id: string;
  content_kind: string;
  entry_key: string;
  /** Null for the shared page (LOCALISE-1). */
  market_code: string | null;
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
    marketCode: row.market_code ?? everyCountry,
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

/** The cms_versions columns the editors read. */
const versionColumns =
  'id, content_kind, entry_key, market_code, language_code, content, status, is_removal, show_from, show_until, published_at, updated_at';

/**
 * The staff half of the store for March: the CMS tables in the app's own database.
 *
 * @param client - the shared Supabase client
 * @returns the editor
 */
export function appDatabaseEditor(client: AppSupabaseClient): WebsiteContentEditor {
  return {
    async listVersions(kind, marketCode) {
      // The shared pages have no country in the table (LOCALISE-1); a country's own wording has.
      const versions = client.from('cms_versions').select(versionColumns).eq('content_kind', kind);
      const ofPlace =
        marketCode === everyCountry
          ? versions.is('market_code', null)
          : versions.eq('market_code', marketCode);
      const { data, error } = await ofPlace.order('updated_at', { ascending: false });
      if (error !== null) throw websiteErrorFrom(error);
      return data.map(versionFromRow);
    },
    async saveDraft(draft) {
      const { data, error } = await client.rpc('admin_save_cms_draft', {
        content_kind: draft.kind,
        entry_key: draft.entryKey,
        // The database reads an empty country as every country (the shared page) and an empty
        // language as none: a notice holds every language.
        market_code: draft.marketCode,
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

/**
 * The whole store for March, both halves (the contract in architecture 1.8.6).
 *
 * @param client - the shared Supabase client
 * @returns the store
 */
export function appDatabaseStore(client: AppSupabaseClient): WebsiteContentStore {
  return { ...appDatabaseReader(client), ...appDatabaseEditor(client) };
}
