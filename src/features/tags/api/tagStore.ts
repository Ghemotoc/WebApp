/**
 * The tag store: the approved tags with their names, for everyone, and the staff queue (CMS-1e).
 *
 * Who calls it: hooks/useTagCatalogue.ts (readers and writers) and hooks/useTagQueue.ts (staff).
 * What it calls next: the tags and tag_names tables (tags_select_public and
 * tag_names_select_public let anyone read approved tags), and admin_list_tags(), admin_name_tag()
 * and admin_reject_tag(), which check the moderation area and write the audit log
 * (…_cms_1e_tags.sql). Staff errors become the website editors' error, so the shared feedback
 * names the fields to fix ("ro:taken").
 */
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { CatalogueTag } from '../lib/tagCatalogue';

/** Which tags the staff queue lists. */
export type TagQueueView = 'waiting' | 'missing';

/** One tag in the staff queue. */
export interface QueuedTag {
  id: string;
  storedName: string;
  storyCount: number;
  names: Record<string, string>;
  missingLanguages: string[];
}

/**
 * Turns a JSON object of names into a plain record, keeping only text values.
 *
 * @param value - names as the database sent them
 * @returns {"ro": "Fantezie", "en": "Fantasy"}
 */
function namesFrom(value: unknown): Record<string, string> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const names: Record<string, string> = {};
  for (const [language, name] of Object.entries(value)) {
    if (typeof name === 'string') names[language] = name;
  }
  return names;
}

/**
 * Every approved tag with its names.
 *
 * @param client - the shared client
 * @returns the catalogue
 * Errors: rejects when the read fails; callers then show tags as stored.
 */
export async function fetchTagCatalogue(client: AppSupabaseClient): Promise<CatalogueTag[]> {
  const { data, error } = await client
    .from('tags')
    .select('name, is_recommended, tag_names(language_code, name)')
    .eq('status', 'approved')
    .order('name');
  if (error !== null) throw new Error(`Couldn't read the tags: ${error.message}`);
  return data.map((row) => ({
    storedName: row.name,
    isRecommended: row.is_recommended,
    names: Object.fromEntries(row.tag_names.map((entry) => [entry.language_code, entry.name])),
  }));
}

/**
 * One view of the staff queue.
 *
 * @param client - the shared client
 * @param view - waiting tags, or approved tags missing a name
 * @returns the tags
 * Errors: a WebsiteContentError ("not_allowed" for staff outside moderation).
 */
export async function listQueuedTags(
  client: AppSupabaseClient,
  view: TagQueueView,
): Promise<QueuedTag[]> {
  const { data, error } = await client.rpc('admin_list_tags', { which_tags: view });
  if (error !== null) throw websiteErrorFrom(error);
  return data.map((row) => ({
    id: row.tag_id,
    storedName: row.name,
    storyCount: row.story_count,
    names: namesFrom(row.names),
    missingLanguages: row.missing_languages,
  }));
}

/**
 * Approves a waiting tag or renames an approved one.
 *
 * @param client - the shared client
 * @param tagId - the tag
 * @param names - its name in each interface language
 * Errors: a WebsiteContentError with the names to fix.
 */
export async function nameTag(
  client: AppSupabaseClient,
  tagId: string,
  names: Record<string, string>,
): Promise<void> {
  const { error } = await client.rpc('admin_name_tag', { tag_id: tagId, names });
  if (error !== null) throw websiteErrorFrom(error);
}

/**
 * Rejects a tag: it leaves every story and the writers are told.
 *
 * @param client - the shared client
 * @param tagId - the tag
 * @param reason - why, for the audit log
 * Errors: a WebsiteContentError ("reason:empty").
 */
export async function rejectTag(
  client: AppSupabaseClient,
  tagId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_reject_tag', { tag_id: tagId, reason });
  if (error !== null) throw websiteErrorFrom(error);
}
