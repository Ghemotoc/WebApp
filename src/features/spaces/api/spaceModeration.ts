/**
 * Space moderators: who helps run a space, its members, its log, and the owner's and moderators'
 * changes (bundle FORUMS-2, part b; story S1-E8-07; board 5.3's "Who runs it" and the settings'
 * Moderators field).
 *
 * Who calls it: hooks/useSpaceModeration.ts. What it calls next: space_moderators(),
 * space_member_list(), space_log(), set_space_moderator() and remove_space_member() in
 * supabase/migrations/…_forums2_b_space_moderators.sql. The database decides who may do what
 * (the owner, a moderator holding the power, or our moderation team); this file reads its answers
 * and never sees a user ID.
 */
import { personFrom, type ForumPerson } from '@/features/forums/api/forumThreads';
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

import { powersFrom, spaceErrorFrom, type SpacePower } from './spaces';

/** A moderator and the powers the owner gave them. */
export interface SpaceModerator {
  person: ForumPerson;
  powers: SpacePower[];
}

/** One member, for the members page. */
export interface SpaceMember {
  person: ForumPerson;
  role: 'owner' | 'moderator' | 'member';
  powers: SpacePower[];
  joinedAt: string;
}

/** One line of a space's log (criterion 2). */
export interface SpaceLogEntry {
  /** Who acted; null when our moderation team did ("the moderation team", never a name). */
  actor: ForumPerson;
  /** What happened: 'moderator_appointed', 'member_removed', 'thread_locked'… */
  action: string;
  /** The person it was about, if any. */
  target: ForumPerson;
  /** The thread it was about, if it is still there. */
  thread: { number: number; title: string } | null;
  /** The reason given. */
  note: string | null;
  /** The powers before and after, for the moderator lines. */
  powersAfter: SpacePower[];
  createdAt: string;
}

/** One page of the log. */
export interface SpaceLogPage {
  entries: SpaceLogEntry[];
  hasMore: boolean;
}

/** What became of a moderator change. */
export type ModeratorOutcome = 'appointed' | 'changed' | 'removed';

/** A JSON object as the database sends it. */
type JsonObject = Record<string, Json | undefined>;

/**
 * Reads a JSON value as an object.
 *
 * @param value - any JSON value
 * @returns the object, or an empty one for anything else
 */
function objectOf(value: Json | undefined): JsonObject {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value))
    return {};
  return value;
}

/**
 * Reads a JSON array as a list of objects.
 *
 * @param value - any JSON value
 * @returns the objects, or none
 */
function rowsOf(value: Json | undefined): JsonObject[] {
  return Array.isArray(value) ? value.map(objectOf) : [];
}

/**
 * Reads a member's role.
 *
 * @param value - the "role" field
 * @returns the role; anything unknown reads as a plain member
 */
function roleFrom(value: Json | undefined): SpaceMember['role'] {
  if (value === 'owner' || value === 'moderator') return value;
  return 'member';
}

/**
 * Reads the thread a log line is about.
 *
 * @param value - the "thread" field
 * @returns its number and title, or null
 */
function logThreadFrom(value: Json | undefined): SpaceLogEntry['thread'] {
  const thread = objectOf(value);
  if (typeof thread['number'] !== 'number') return null;
  return { number: thread['number'], title: String(thread['title'] ?? '') };
}

/**
 * Reads one line of the log.
 *
 * @param row - one of space_log()'s entries
 * @returns the line
 */
export function logEntryFrom(row: JsonObject): SpaceLogEntry {
  return {
    actor: personFrom(row['actor']),
    action: String(row['action'] ?? ''),
    target: personFrom(row['target']),
    thread: logThreadFrom(row['thread']),
    note: typeof row['note'] === 'string' ? row['note'] : null,
    powersAfter: powersFrom(objectOf(row['details'])['powers_after']),
    createdAt: String(row['created_at'] ?? ''),
  };
}

/**
 * Reads who helps run a space, for "Who runs it". Anyone who may see the space reads it.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the moderators, earliest appointed first
 * @throws Error in plain words when the database can't be reached
 */
export async function fetchSpaceModerators(
  client: AppSupabaseClient,
  slug: string,
): Promise<SpaceModerator[]> {
  const { data, error } = await client.rpc('space_moderators', { slug });
  if (error) throw new Error(`Could not read the moderators: ${error.message}`);
  return rowsOf(data).map((row) => ({
    person: personFrom(row['person']),
    powers: powersFrom(row['powers']),
  }));
}

/**
 * Reads a space's members, for the owner and moderators with the members power.
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @returns the owner, then the moderators, then the members by when they joined
 * @throws SpaceError when refused
 */
export async function fetchSpaceMembers(
  client: AppSupabaseClient,
  slug: string,
): Promise<SpaceMember[]> {
  const { data, error } = await client.rpc('space_member_list', { slug });
  if (error) throw spaceErrorFrom(error);
  return rowsOf(data).map((row) => ({
    person: personFrom(row['person']),
    role: roleFrom(row['role']),
    powers: powersFrom(row['powers']),
    joinedAt: String(row['joined_at'] ?? ''),
  }));
}

/**
 * Reads a page of the space's log, newest first (the owner and our moderation team only).
 *
 * @param client - the Supabase client
 * @param slug - the space's address
 * @param skip - how many lines the page already shows
 * @returns the page
 * @throws SpaceError when refused
 */
export async function fetchSpaceLog(
  client: AppSupabaseClient,
  slug: string,
  skip: number,
): Promise<SpaceLogPage> {
  const { data, error } = await client.rpc('space_log', { slug, skip });
  if (error) throw spaceErrorFrom(error);
  const page = objectOf(data);
  return { entries: rowsOf(page['entries']).map(logEntryFrom), hasMore: page['has_more'] === true };
}

/**
 * The owner makes a member a moderator, changes their powers, or (with no powers) makes them a
 * plain member again.
 *
 * @param client - the Supabase client
 * @param change - the space, the member's username and the powers
 * @returns what happened
 * @throws SpaceError when refused (not the owner, not a member, another age group…)
 */
export async function setSpaceModerator(
  client: AppSupabaseClient,
  change: { slug: string; handle: string; powers: SpacePower[] },
): Promise<ModeratorOutcome> {
  const { data, error } = await client.rpc('set_space_moderator', change);
  if (error) throw spaceErrorFrom(error);
  const outcome = objectOf(data)['outcome'];
  if (outcome === 'appointed' || outcome === 'removed') return outcome;
  return 'changed';
}

/**
 * Takes a member out of the space (the members power). A moderator can't remove another
 * moderator; only the owner or our moderation team can.
 *
 * @param client - the Supabase client
 * @param removal - the space, the member's username and an optional reason for the log
 * @throws SpaceError when refused
 */
export async function removeSpaceMember(
  client: AppSupabaseClient,
  removal: { slug: string; handle: string; reason: string },
): Promise<void> {
  const reason = removal.reason.trim();
  const { error } = await client.rpc('remove_space_member', {
    slug: removal.slug,
    handle: removal.handle,
    reason: reason === '' ? undefined : reason,
  });
  if (error) throw spaceErrorFrom(error);
}
