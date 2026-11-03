/**
 * "Possible returning user": the accounts a case links to its account, and the moderator's link
 * and unlink actions (bundle ADMIN-2, part f2; Robert's brief of 2 Nov 2026, section 6).
 *
 * Who calls it: hooks/useCaseAccountLinks.ts (CaseAccountLinks on the case page).
 * What it calls next: admin_case_account_links(), admin_link_returning_user() and
 * admin_unlink_returning_user() (…_admin2_f2_returning_users.sql), which check the caller is
 * moderation staff who may see the case and write the audit log.
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { failureFromCode, ModerationError } from './moderationQueue';

/** Where a link came from: a matching sign-up IP, or a moderator. */
export type AccountLinkSource = 'sign_up_ip' | 'moderator';

/** One linked account, as the panel shows it. */
export interface CaseAccountLink {
  id: string;
  /** The other account's user ID, for its staff page (staff see user IDs). */
  userId: string;
  handle: string;
  /** When its live ban started, or null when it isn't banned. */
  bannedAt: string | null;
  source: AccountLinkSource;
  reason: string;
  /** The moderator who linked it, or null for an automatic link. */
  linkedBy: string | null;
  createdAt: string;
}

/** A change the moderator asks for. */
export type AccountLinkChange =
  | { kind: 'link'; caseId: string; handle: string; reason: string }
  | { kind: 'unlink'; linkId: string; reason: string };

/**
 * A text field of the answer, or null.
 *
 * @returns the text when it is a string
 */
function textOf(record: Record<string, Json | undefined>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

/**
 * The JSON object, or null for anything else.
 *
 * @returns the object
 */
function objectOf(row: Json): Record<string, Json | undefined> | null {
  if (row === null || typeof row !== 'object' || Array.isArray(row)) return null;
  return row;
}

/**
 * One link from the database's JSON.
 *
 * @returns the link, or null for anything that isn't one
 */
function linkFrom(json: Json): CaseAccountLink | null {
  const row = objectOf(json);
  if (row === null) return null;
  const id = textOf(row, 'id');
  const userId = textOf(row, 'user_id');
  const handle = textOf(row, 'handle');
  if (id === null || userId === null || handle === null) return null;
  return {
    id,
    userId,
    handle,
    bannedAt: row.is_banned === true ? textOf(row, 'banned_at') : null,
    source: textOf(row, 'source') === 'moderator' ? 'moderator' : 'sign_up_ip',
    reason: textOf(row, 'reason') ?? '',
    linkedBy: textOf(row, 'linked_by'),
    createdAt: textOf(row, 'created_at') ?? '',
  };
}

/**
 * Reads the links of one case.
 *
 * @param client - the shared Supabase client
 * @param caseId - the case
 * @returns the links, newest first (empty when there are none)
 * @throws ModerationError when the caller may not see the case or the database can't be reached
 */
export async function fetchCaseAccountLinks(
  client: AppSupabaseClient,
  caseId: string,
): Promise<CaseAccountLink[]> {
  const { data, error } = await client.rpc('admin_case_account_links', { target_case_id: caseId });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
  if (!Array.isArray(data)) return [];
  return data.map(linkFrom).filter((link): link is CaseAccountLink => link !== null);
}

/**
 * Links another account, or removes a link, with the moderator's reason.
 *
 * @param client - the shared Supabase client
 * @param change - what to do
 * @throws ModerationError: refused for an unknown username, the case's own account, a link that
 *   already exists or a missing reason; not_allowed outside moderation staff
 */
export async function changeAccountLink(
  client: AppSupabaseClient,
  change: AccountLinkChange,
): Promise<void> {
  const { error } =
    change.kind === 'link'
      ? await client.rpc('admin_link_returning_user', {
          target_case_id: change.caseId,
          other_handle: change.handle,
          reason_given: change.reason,
        })
      : await client.rpc('admin_unlink_returning_user', {
          link_id: change.linkId,
          reason_given: change.reason,
        });
  if (error !== null) throw new ModerationError(failureFromCode(error.code));
}
