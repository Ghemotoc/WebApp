/**
 * Canned replies for support staff: the list, adding or changing one, and deleting one (story
 * S1-E11-13, part 13b; bundle ADMIN-2h3b; criterion 8).
 *
 * Who calls it: hooks/useCannedReplies.ts (CannedRepliesPage and CannedReplyPicker).
 * What it calls next: the support_canned_replies table (read by staff with the support_tickets
 * area through its RLS policy), admin_save_canned_reply() and admin_delete_canned_reply(), which
 * check the same area and write the audit log with the before and after words.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import { supportErrorFrom } from './supportTickets';

/** One canned reply. */
export interface CannedReply {
  id: string;
  title: string;
  bodyRo: string;
  bodyEn: string;
  updatedAt: string;
}

/** What staff fill in to add or change a canned reply; id is null for a new one. */
export interface CannedReplyDraft {
  id: string | null;
  title: string;
  bodyRo: string;
  bodyEn: string;
}

/** The longest each field may be; the database checks the same limits. */
export const cannedReplyLimits = { title: 80, body: 4000 } as const;

/**
 * Every canned reply that isn't deleted, by title.
 *
 * @throws SupportError
 */
export async function fetchCannedReplies(client: AppSupabaseClient): Promise<CannedReply[]> {
  const { data, error } = await client
    .from('support_canned_replies')
    .select('id, title, body_ro, body_en, updated_at')
    .order('title');
  if (error !== null) throw supportErrorFrom(error);
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    bodyRo: row.body_ro,
    bodyEn: row.body_en,
    updatedAt: row.updated_at,
  }));
}

/**
 * Adds a canned reply, or changes one; logged with the before and after words.
 *
 * @returns the reply's ID
 * @throws SupportError('refused') for an empty or long field, ('not_found') for a deleted reply,
 *   ('not_allowed') for anyone without the support_tickets area
 */
export async function saveCannedReply(
  client: AppSupabaseClient,
  draft: CannedReplyDraft,
): Promise<string> {
  const { data, error } = await client.rpc('admin_save_canned_reply', {
    // The generated types want a string; null is how a new reply is asked for.
    reply_id: draft.id as string,
    title: draft.title,
    body_ro: draft.bodyRo,
    body_en: draft.bodyEn,
  });
  if (error !== null) throw supportErrorFrom(error);
  return data;
}

/**
 * Takes a canned reply out of the list; the audit log keeps its words.
 *
 * @throws SupportError
 */
export async function deleteCannedReply(client: AppSupabaseClient, replyId: string): Promise<void> {
  const { error } = await client.rpc('admin_delete_canned_reply', { reply_id: replyId });
  if (error !== null) throw supportErrorFrom(error);
}
