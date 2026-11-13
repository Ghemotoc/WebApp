/**
 * Class points for our moderation team (bundle CLASS-POINTS, part 1; story S1-E8-16): the open
 * flags, the gifts behind a flag with who gave them, removing a gift and closing a flag.
 *
 * Who calls it: hooks/useClassPointsStaff.ts. What it calls next: admin_class_point_flags(),
 * admin_class_gifts(), admin_remove_class_gift() and admin_close_class_point_flag(). Each checks
 * the caller is staff with the Moderation area; reading the givers and every change is written
 * to the audit log by the database. Only this file ever carries a giver's username, and only the
 * staff page uses it (Robert, 13 Nov 2026, decision 8).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';

/** Why the database refused a staff call. */
export type ClassPointsStaffFailure =
  'not_allowed' | 'reason_empty' | 'reason_too_long' | 'missing' | 'unreachable';

/** The error a refused staff call throws. */
export class ClassPointsStaffError extends Error {
  constructor(readonly failure: ClassPointsStaffFailure) {
    super(`The class points staff call was refused: ${failure}`);
    this.name = 'ClassPointsStaffError';
  }
}

/** The database's hints and the failure each one means. */
const failureForHint: Record<string, ClassPointsStaffFailure> = {
  'reason:empty': 'reason_empty',
  'reason:too_long': 'reason_too_long',
  'gift:missing': 'missing',
  'flag:missing': 'missing',
};

/**
 * Turns a database error into a ClassPointsStaffError.
 *
 * @param error - Postgres's hint and code
 * @returns the failure by hint; not_allowed for a refusal by role; otherwise unreachable
 */
export function classPointsStaffErrorFrom(error: {
  hint?: string | null;
  code?: string | null;
}): ClassPointsStaffError {
  const byHint = failureForHint[error.hint ?? ''];
  if (byHint !== undefined) return new ClassPointsStaffError(byHint);
  // 42501 is Postgres's "insufficient privilege".
  return new ClassPointsStaffError(error.code === '42501' ? 'not_allowed' : 'unreachable');
}

/** A JSON object, once we know the answer is one. */
type JsonObject = { [key: string]: Json | undefined };

/**
 * Reads an answer as an object.
 *
 * @param value - any JSON
 * @returns the object, or null for anything else
 */
function objectFrom(value: Json | undefined): JsonObject | null {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value;
}

/**
 * Reads a text.
 *
 * @param value - any JSON
 * @returns the text, or null when it isn't one or is empty
 */
function textFrom(value: Json | undefined): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** One open flag. */
export interface ClassPointFlag {
  id: string;
  kind: 'teacher_report' | 'pair';
  className: string;
  /** A teacher's report is about one chapter. */
  chapter: { id: string; storyTitle: string; position: number; writerHandle: string } | null;
  /** A pair flag is about two pupils. */
  pair: [string, string] | null;
  /** The teacher's line, or null. */
  note: string | null;
  createdAt: string;
}

/**
 * Reads the chapter a teacher's report is about.
 *
 * @param row - the flag's row
 * @returns the chapter with its writer's username, or null for a pair flag
 */
function flagChapterFrom(row: JsonObject): ClassPointFlag['chapter'] {
  const chapter = objectFrom(row['chapter']);
  if (chapter === null) return null;
  return {
    id: String(chapter['id']),
    storyTitle: String(chapter['story_title']),
    position: typeof chapter['position'] === 'number' ? chapter['position'] : 0,
    writerHandle: textFrom(row['writer_handle']) ?? '',
  };
}

/**
 * Reads the two pupils a pair flag is about.
 *
 * @param row - the flag's row
 * @returns their usernames, or null for a teacher's report
 */
function flagPairFrom(row: JsonObject): ClassPointFlag['pair'] {
  const pair = row['pair'];
  if (!Array.isArray(pair)) return null;
  return [textFrom(pair[0]) ?? '', textFrom(pair[1]) ?? ''];
}

/**
 * Reads one flag.
 *
 * @param value - the object
 * @returns the flag, or null when it isn't one
 */
function flagFrom(value: Json | undefined): ClassPointFlag | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return {
    id: String(row['id']),
    kind: row['kind'] === 'pair' ? 'pair' : 'teacher_report',
    className: textFrom(objectFrom(row['class'])?.['name']) ?? '',
    chapter: flagChapterFrom(row),
    pair: flagPairFrom(row),
    note: textFrom(row['note']),
    createdAt: String(row['created_at']),
  };
}

/** One gift, with who gave it: for our moderators only. */
export interface ClassGift {
  id: string;
  giverHandle: string;
  receiverHandle: string;
  storyTitle: string;
  chapterPosition: number;
  points: number;
  note: string | null;
  weekStart: string;
  /** Why a moderator removed it, or null while it counts. */
  removedReason: string | null;
  isRemoved: boolean;
}

/**
 * Reads one gift.
 *
 * @param value - the object
 * @returns the gift, or null when it isn't one
 */
function giftFrom(value: Json | undefined): ClassGift | null {
  const row = objectFrom(value);
  if (row === null) return null;
  return {
    id: String(row['id']),
    giverHandle: String(row['giver_handle']),
    receiverHandle: String(row['receiver_handle']),
    storyTitle: String(row['story_title']),
    chapterPosition: typeof row['chapter_position'] === 'number' ? row['chapter_position'] : 0,
    points: typeof row['points'] === 'number' ? row['points'] : 0,
    note: textFrom(row['note']),
    weekStart: String(row['week_start']),
    removedReason: textFrom(row['removed_reason']),
    isRemoved: row['removed_at'] !== null && row['removed_at'] !== undefined,
  };
}

/**
 * Reads a list with one reader, leaving out anything that isn't an item.
 *
 * @param data - the answer
 * @param read - the reader for one item
 * @returns the items
 */
function listFrom<Item>(data: Json, read: (value: Json | undefined) => Item | null): Item[] {
  const items: Item[] = [];
  for (const entry of Array.isArray(data) ? data : []) {
    const item = read(entry);
    if (item !== null) items.push(item);
  }
  return items;
}

/**
 * The open flags, oldest first.
 *
 * @param client - the Supabase client
 * @returns the flags
 * @throws ClassPointsStaffError when refused (not_allowed) or unreachable
 */
export async function fetchClassPointFlags(client: AppSupabaseClient): Promise<ClassPointFlag[]> {
  const { data, error } = await client.rpc('admin_class_point_flags');
  if (error) throw classPointsStaffErrorFrom(error);
  return listFrom(data, flagFrom);
}

/**
 * The gifts behind a flag, with who gave them. The database writes this read to the audit log.
 *
 * @param client - the Supabase client
 * @param flag - the flag: its chapter's gifts, or the gifts its two pupils gave each other
 * @returns the gifts, newest week first
 * @throws ClassPointsStaffError when refused (not_allowed) or unreachable
 */
export async function fetchClassGifts(
  client: AppSupabaseClient,
  flag: ClassPointFlag,
): Promise<ClassGift[]> {
  const request =
    flag.chapter !== null
      ? { target_chapter_id: flag.chapter.id }
      : { first_handle: flag.pair?.[0] ?? '', second_handle: flag.pair?.[1] ?? '' };
  const { data, error } = await client.rpc('admin_class_gifts', request);
  if (error) throw classPointsStaffErrorFrom(error);
  return listFrom(data, giftFrom);
}

/**
 * Removes one gift, with a reason.
 *
 * @param client - the Supabase client
 * @param request - the gift and why
 * @throws ClassPointsStaffError when refused (not_allowed, reason_*, missing)
 */
export async function removeClassGift(
  client: AppSupabaseClient,
  request: { giftId: string; reason: string },
): Promise<void> {
  const { error } = await client.rpc('admin_remove_class_gift', {
    gift_id: request.giftId,
    reason: request.reason,
  });
  if (error) throw classPointsStaffErrorFrom(error);
}

/**
 * Closes a flag once it was looked into.
 *
 * @param client - the Supabase client
 * @param flagId - the flag
 * @throws ClassPointsStaffError when refused (not_allowed, missing)
 */
export async function closeClassPointFlag(
  client: AppSupabaseClient,
  flagId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_close_class_point_flag', { flag_id: flagId });
  if (error) throw classPointsStaffErrorFrom(error);
}
