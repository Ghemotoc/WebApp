/**
 * The staff side of the forums: list every forum with its names, add or change one, remove an
 * empty one (bundle FORUMS-1, part a; S1-E8-01, first criterion).
 *
 * Who calls it: hooks/useForumAdmin.ts (the page /staff/forums). What it calls next:
 * admin_list_forums(), admin_save_forum() and admin_delete_forum() in
 * supabase/migrations/…_forums1_a_forum_categories.sql, which let only the owner and admins act
 * and write the audit log. Refusals come back as the shared staff error (WebsiteContentError),
 * with the fields to fix ("ro:empty", "parent:too_deep").
 */
import { websiteErrorFrom } from '@/features/website/api/websiteContentStore';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import type { ForumAccent } from './forumIndex';

/** A forum's name and description in one language. */
export interface ForumName {
  name: string;
  description: string;
}

/** One forum as staff see it. */
export interface StaffForum {
  id: string;
  parentId: string | null;
  level: number;
  slug: string;
  position: number;
  isPinned: boolean;
  accent: ForumAccent;
  doodle: string | null;
  /** Its names by language code. */
  names: Record<string, ForumName>;
  /** The interface languages it has no name in yet. */
  missingLanguages: string[];
}

/** What staff send to add or change a forum. */
export interface ForumChanges {
  /** Null to add a new one. */
  forumId: string | null;
  parentId: string | null;
  slug: string;
  position: number;
  isPinned: boolean;
  accent: ForumAccent;
  doodle: string | null;
  names: Record<string, ForumName>;
}

/**
 * Reads the names from the database's JSON ({"ro": {"name", "description"}}).
 *
 * @param value - the names column
 * @returns the names by language
 */
function namesFrom(value: Json): Record<string, ForumName> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {};
  const names: Record<string, ForumName> = {};
  for (const [code, entry] of Object.entries(value)) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) continue;
    names[code] = {
      name: String(entry['name'] ?? ''),
      description: String(entry['description'] ?? ''),
    };
  }
  return names;
}

/**
 * Turns the names into plain JSON for the database ({"ro": {"name", "description"}}).
 *
 * @param names - the names by language
 * @returns the same names as a JSON object
 */
function namesAsJson(names: Record<string, ForumName>): Json {
  return Object.fromEntries(
    Object.entries(names).map(([code, entry]) => [
      code,
      { name: entry.name, description: entry.description },
    ]),
  );
}

/**
 * Reads every live forum, for staff.
 *
 * @param client - the shared client
 * @returns the forums, categories first
 * @throws WebsiteContentError when the person may not, or the server can't be reached
 */
export async function listStaffForums(client: AppSupabaseClient): Promise<StaffForum[]> {
  const { data, error } = await client.rpc('admin_list_forums');
  if (error !== null) throw websiteErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    // The generated type says string, but a category's parent is null.
    parentId: (row.parent_id as string | null) ?? null,
    level: row.level,
    slug: row.slug,
    position: row.position,
    isPinned: row.is_pinned,
    accent: row.accent,
    doodle: (row.doodle as string | null) ?? null,
    names: namesFrom(row.names),
    missingLanguages: row.missing_languages,
  }));
}

/**
 * Adds a forum or changes one.
 *
 * @param client - the shared client
 * @param changes - everything staff set
 * @returns the forum's id
 * @throws WebsiteContentError with the fields to fix
 */
export async function saveForum(client: AppSupabaseClient, changes: ForumChanges): Promise<string> {
  const { data, error } = await client.rpc('admin_save_forum', {
    // The generated argument types say string; null adds a forum or makes a category.
    forum_id: changes.forumId as string,
    parent_id: changes.parentId as string,
    slug: changes.slug.trim(),
    sort_position: changes.position,
    is_pinned: changes.isPinned,
    accent: changes.accent,
    doodle: changes.doodle as string,
    names: namesAsJson(changes.names),
  });
  if (error !== null) throw websiteErrorFrom(error);
  return data;
}

/**
 * Removes an empty forum, with a reason for the audit log.
 *
 * @param client - the shared client
 * @param forumId - the forum
 * @param reason - why
 * @throws WebsiteContentError ("forum:has_children", "reason:empty")
 */
export async function removeForum(
  client: AppSupabaseClient,
  forumId: string,
  reason: string,
): Promise<void> {
  const { error } = await client.rpc('admin_delete_forum', { forum_id: forumId, reason });
  if (error !== null) throw websiteErrorFrom(error);
}
