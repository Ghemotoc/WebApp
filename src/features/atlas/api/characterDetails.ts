/**
 * Supabase calls for where a writer's own details sit on a character sheet (bundle GAPS-1; board
 * AtlasCharacterSheet: "Add detail" under each group and "Add a group of details").
 *
 * - add_character_detail(): a detail under a built-in group, in a group of the writer's own, or in
 *   neither; like every field of the writer's own it shows on every sheet in the story
 *   (S1-E17-10).
 * - rename_character_detail_group(): a new name for one of the writer's own groups.
 * It also holds the shape of one of the writer's own fields (CharacterField) and how it is read
 * from story_cast().
 * Who calls it: useDetailChangers, and api/characters.ts for the fields in the cast. What it calls: the
 * two functions above through the shared Supabase client.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

import type { SheetGroup } from './characters';

/** Where a new detail goes: under a built-in group, in a group of the writer's own, or neither. */
export interface NewDetailPlace {
  sheetGroup: SheetGroup | null;
  ownGroup: string | null;
}

/** The database's name for each built-in sheet group (story_character_fields.sheet_group). */
const sheetGroupColumnValues: Record<SheetGroup, string> = {
  basics: 'basics',
  lookAndVoice: 'look_and_voice',
  inside: 'inside',
  inTheStory: 'in_the_story',
};

/** One of the writer's own fields (S1-E17-10), with the place it sits on the sheet (GAPS-1). */
export interface CharacterField {
  id: string;
  name: string;
  isHidden: boolean;
  /** The built-in group it shows under, or null. */
  sheetGroup: SheetGroup | null;
  /** The writer's own group it sits in, or null. Never set together with sheetGroup. */
  ownGroup: string | null;
}

/** One of the writer's own fields as story_cast() answers it. */
export interface CharacterFieldRow {
  id: string;
  name: string;
  position: number;
  is_hidden: boolean;
  sheet_group: string | null;
  own_group: string | null;
}

/**
 * One of the writer's own fields, from the database's answer.
 *
 * @param row - the field as story_cast() answers it
 * @returns the field; a sheet group this version doesn't know counts as no group
 */
export function toCharacterField(row: CharacterFieldRow): CharacterField {
  const groups = Object.keys(sheetGroupColumnValues) as SheetGroup[];
  return {
    id: row.id,
    name: row.name,
    isHidden: row.is_hidden,
    sheetGroup: groups.find((group) => sheetGroupColumnValues[group] === row.sheet_group) ?? null,
    ownGroup: row.own_group,
  };
}

/**
 * Why a detail or a group wasn't saved, when the database says so: the place already holds a
 * detail with that name, or the story already has a group with that name. Anything else (the
 * bounds, the connection) is 'other'.
 */
export type DetailRefusal = 'detailNameTaken' | 'groupNameTaken' | 'other';

/** The refusal behind each hint add_character_detail() and rename_character_detail_group() raise. */
const refusalForHint: Record<string, DetailRefusal> = {
  detail_name_taken: 'detailNameTaken',
  name_taken: 'groupNameTaken',
};

/** A change to the details that didn't save, with the reason the screen words its message from. */
export class DetailChangeError extends Error {
  readonly refusal: DetailRefusal;

  constructor(message: string, refusal: DetailRefusal) {
    super(message);
    this.name = 'DetailChangeError';
    this.refusal = refusal;
  }
}

/**
 * The reason a change to the details failed.
 *
 * @param error - whatever addDetail or renameDetailGroup threw
 * @returns the refusal the database named, or 'other'
 */
export function detailRefusalOf(error: unknown): DetailRefusal {
  return error instanceof DetailChangeError ? error.refusal : 'other';
}

/** The message for each refusal the database names, as a key in the atlas locale file. */
const messageKeyForRefusal = {
  detailNameTaken: 'characters.details.nameTaken',
  groupNameTaken: 'characters.details.groupNameTaken',
} as const;

/**
 * The locale key of the message for a change that didn't save.
 *
 * @param error - whatever addDetail or renameDetailGroup threw
 * @param otherwiseKey - the form's general "that didn't save" message
 * @returns the key for "that name is taken" when the database said so, or otherwiseKey
 */
export function detailFailureKey<Key extends string>(error: unknown, otherwiseKey: Key) {
  const refusal = detailRefusalOf(error);
  return refusal === 'other' ? otherwiseKey : messageKeyForRefusal[refusal];
}

/** Throws unless the database answered { outcome: 'ok' }. */
function requireOk(
  answer: { data: unknown; error: { message: string; hint?: string | null } | null },
  action: string,
): void {
  if (answer.error !== null) {
    const refusal = refusalForHint[answer.error.hint ?? ''] ?? 'other';
    throw new DetailChangeError(`Could not ${action}: ${answer.error.message}`, refusal);
  }
  const data = answer.data as Record<string, unknown> | null;
  if (data?.outcome !== 'ok') throw new Error(`Could not ${action}: ${String(data?.outcome)}`);
}

/**
 * Adds one of the writer's own details to every sheet in the story, in a place.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param detail - the detail's name and where it sits
 * Errors: throws a DetailChangeError when the database refuses it (the place already holds that
 *   name, 40 details or 12 groups already, an empty name) or can't be reached.
 */
export async function addCharacterDetail(
  client: AppSupabaseClient,
  slug: string,
  detail: { name: string } & NewDetailPlace,
): Promise<void> {
  const answer = await client.rpc('add_character_detail', {
    story_slug: slug,
    field_name: detail.name,
    // The generated types mark every argument as text; the function reads null as "no place".
    sheet_group: (detail.sheetGroup === null
      ? null
      : sheetGroupColumnValues[detail.sheetGroup]) as string,
    own_group: detail.ownGroup as string,
  });
  requireOk(answer, 'add the detail');
}

/**
 * Renames one of the writer's own groups of details.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param names - the group's name now and its new name
 * Errors: throws a DetailChangeError when the database refuses it (another group has that name,
 *   an empty name) or can't be reached.
 */
export async function renameCharacterDetailGroup(
  client: AppSupabaseClient,
  slug: string,
  names: { from: string; to: string },
): Promise<void> {
  const answer = await client.rpc('rename_character_detail_group', {
    story_slug: slug,
    group_name: names.from,
    new_name: names.to,
  });
  requireOk(answer, 'rename the group');
}
