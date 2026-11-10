/**
 * Reads and changes the characters of one story in Story Atlas (stories S1-E17-08 to S1-E17-11
 * and S1-E17-13).
 *
 * Who calls it: hooks/useStoryCast.ts.
 * What it calls next: Supabase (supabase/migrations/…_s1_e17_08_characters.sql):
 * - story_cast(): the characters, the writer's own fields and the chapters to pick from;
 * - create_story_character(), update_story_character() and delete_story_character();
 * - add_character_field() and update_character_field() (the writer's own fields, S1-E17-10);
 * - set_character_picture() and remove_character_picture(), with the upload and file delete in
 *   src/features/pictures/api/pictures.ts (S1-E17-11);
 * - add_character_relationship() and delete_character_relationship() (S1-E17-14).
 * Characters are private: only their writer can read them (story_characters_select_own).
 */
import type { Json } from '@/lib/database.types';
import type { AppSupabaseClient } from '@/lib/supabase';
import {
  deleteStoredPicture,
  pictureViewsFromJson,
  type PictureView,
} from '@/features/pictures/api/pictures';

/** The groups of the cast list, in the order they show (S1-E17-08). */
export const characterRoles = [
  'protagonist',
  'deuteragonist',
  'antagonist',
  'supporting',
  'minor',
  'mentioned',
] as const;
export type CharacterRole = (typeof characterRoles)[number];

/** The sheet's four groups and their text fields, in order (S1-E17-09). */
export const sheetGroups = {
  basics: [
    'also_known_as',
    'species',
    'pronouns',
    'age_or_born',
    'life_status',
    'occupation',
    'origin',
  ],
  lookAndVoice: ['appearance', 'distinguishing_marks', 'voice'],
  inside: ['personality', 'wants', 'needs', 'fear_or_wound', 'secrets', 'values_and_code'],
  inTheStory: ['backstory', 'arc', 'key_lines', 'notes'],
} as const;
export type SheetGroup = keyof typeof sheetGroups;
/**
 * A sheet field's key: one of the groups' fields, or 'summary', the character in a line that the
 * cast cards and the sheet's header show under the name (G10a; character_sheet_keys()).
 */
export type SheetKey = (typeof sheetGroups)[SheetGroup][number] | 'summary';

/** One character as the Characters page shows it. */
export interface StoryCharacter {
  id: string;
  name: string;
  role: CharacterRole;
  sheet: Partial<Record<SheetKey, string>>;
  /** The writer's own fields' values, by field ID (S1-E17-10). */
  customValues: Record<string, string>;
  /** The chapter code of the first appearance, or null. */
  firstAppearance: string | null;
  /** The picture, or null when there is none (the initials show, S1-E17-11). */
  picture: PictureView | null;
  pictureAlt: string;
}

/** The relationship types, in the order the list offers them (S1-E17-14). */
export const relationshipKinds = [
  'parent_of',
  'sibling_of',
  'partner_of',
  'cousin_of',
  'loves',
  'made',
  'friend_of',
  'ally_of',
  'mentors',
  'works_for',
  'enemy_of',
  'resents',
  'killed',
  'custom',
] as const;
export type RelationshipKind = (typeof relationshipKinds)[number];

/** How two characters are connected, read "<from> is <kind> <to>" (S1-E17-14). */
export interface CharacterRelationship {
  id: string;
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  /** The writer's own label, for a custom relationship only. */
  customLabel: string;
  /** For a custom relationship: what the second character is to the first; may be empty (G10b). */
  reverseLabel: string;
  /** For a cousin only: 1 to 3 (first to third cousin), and 0 to 3 times removed (G10b). */
  cousinDegree: number | null;
  cousinRemoved: number | null;
  note: string;
}

/** One of the writer's own fields (S1-E17-10). */
export interface CharacterField {
  id: string;
  name: string;
  isHidden: boolean;
}

/** Everything the Characters page shows. */
export interface StoryCast {
  /** The story's row ID: the folder its pictures go in (never a user ID). */
  storyId: string;
  storyTitle: string;
  characters: StoryCharacter[];
  fields: CharacterField[];
  chapters: { code: string; position: number; title: string }[];
  relationships: CharacterRelationship[];
}

/** The cache key of one story's cast. */
export const storyCastQueryKey = (userId: string | null, slug: string) => [
  'story-cast',
  userId,
  slug,
];

/** One character as story_cast() answers it. */
interface CharacterRow {
  id: string;
  name: string;
  role: CharacterRole;
  sheet: Partial<Record<SheetKey, string>>;
  custom_values: Record<string, string>;
  first_appearance: string | null;
  picture: Json | null;
  picture_alt: string;
}

/** What story_cast() answers for one of the caller's stories. */
interface StoryCastRow {
  outcome: 'ok';
  story: { id: string; slug: string; title: string };
  characters: CharacterRow[];
  fields: { id: string; name: string; position: number; is_hidden: boolean }[];
  chapters: { code: string; position: number; title: string }[];
  relationships: {
    id: string;
    from: string;
    to: string;
    kind: RelationshipKind;
    custom_label: string;
    reverse_label: string;
    cousin_degree: number | null;
    cousin_removed: number | null;
    note: string;
  }[];
}

/**
 * Turns the characters into the page's names, with a signed address for each picture.
 *
 * @returns the characters in story_cast()'s order (by name)
 */
async function toCharacters(
  client: AppSupabaseClient,
  rows: CharacterRow[],
): Promise<StoryCharacter[]> {
  // Step 1: every picture at once, keyed by the character's ID.
  const pictureMap: Record<string, Json | null> = {};
  for (const row of rows) pictureMap[row.id] = row.picture;
  const pictures = await pictureViewsFromJson(client, pictureMap);
  // Step 2: each character, with its picture or none.
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    role: row.role,
    sheet: row.sheet,
    customValues: row.custom_values,
    firstAppearance: row.first_appearance,
    picture: pictures[row.id] ?? null,
    pictureAlt: row.picture_alt,
  }));
}

/**
 * Reads one story's cast.
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @returns the cast, or null when it isn't the writer's live story
 * Errors: throws when the database can't be reached or answers something unexpected.
 */
export async function fetchStoryCast(
  client: AppSupabaseClient,
  slug: string,
): Promise<StoryCast | null> {
  const { data, error } = await client.rpc('story_cast', { story_slug: slug });
  if (error !== null) throw new Error(`Could not read the characters: ${error.message}`);
  const answer = data as { outcome?: string } | null;
  if (answer?.outcome === 'not_found') return null;
  if (answer?.outcome !== 'ok') {
    throw new Error(`Unexpected answer from story_cast: ${JSON.stringify(data)}`);
  }
  const row = answer as StoryCastRow;
  return {
    storyId: row.story.id,
    storyTitle: row.story.title,
    characters: await toCharacters(client, row.characters),
    fields: row.fields.map((field) => ({
      id: field.id,
      name: field.name,
      isHidden: field.is_hidden,
    })),
    chapters: row.chapters,
    relationships: row.relationships.map((link) => ({
      id: link.id,
      fromId: link.from,
      toId: link.to,
      kind: link.kind,
      customLabel: link.custom_label,
      reverseLabel: link.reverse_label,
      cousinDegree: link.cousin_degree,
      cousinRemoved: link.cousin_removed,
      note: link.note,
    })),
  };
}

/**
 * Reads the outcome of a Story Atlas function and throws unless it is ok.
 *
 * @param answer - what the function returned
 * @param action - what was being done, for the error
 * @returns the answer as an object
 */
function okAnswer(
  answer: { data: unknown; error: { message: string } | null },
  action: string,
): Record<string, unknown> {
  if (answer.error !== null) throw new Error(`Could not ${action}: ${answer.error.message}`);
  const data = answer.data as Record<string, unknown> | null;
  if (data?.outcome !== 'ok') throw new Error(`Could not ${action}: ${String(data?.outcome)}`);
  return data;
}

/**
 * "New character" (S1-E17-08).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param name - the new character's name ("New character" in the writer's language)
 * @returns the new character's ID, so its sheet opens
 * Errors: throws when the database refuses it (500 characters already) or can't be reached.
 */
export async function createCharacter(
  client: AppSupabaseClient,
  slug: string,
  name: string,
): Promise<string> {
  const answer = await client.rpc('create_story_character', {
    story_slug: slug,
    character_name: name,
    character_role: 'supporting',
  });
  return String(okAnswer(answer, 'add the character').id);
}

/** What one save changes: a name, a role, sheet text, a custom value, the first appearance or
 * the picture's alt text (each field saves by itself). */
export type CharacterChange =
  | { name: string }
  | { role: CharacterRole }
  | { sheet: Partial<Record<SheetKey, string>> }
  | { custom: Record<string, string> }
  | { first_appearance: string }
  | { picture_alt: string };

/**
 * Saves one change to a character (S1-E17-08 to S1-E17-11).
 *
 * @param client - the shared Supabase client
 * @param characterId - the character
 * @param change - what changed
 * Errors: throws when the database refuses it (an empty name, text that is too long) or can't be
 *   reached.
 */
export async function saveCharacterChange(
  client: AppSupabaseClient,
  characterId: string,
  change: CharacterChange,
): Promise<void> {
  const answer = await client.rpc('update_story_character', {
    character_id: characterId,
    changes: change,
  });
  okAnswer(answer, 'save the character');
}

/** Where a file the database let go of is, so it can be deleted. */
function fileFrom(value: unknown): { bucket: string; path: string } | null {
  if (value === null || typeof value !== 'object') return null;
  const file = value as { bucket?: unknown; path?: unknown };
  if (typeof file.bucket !== 'string' || typeof file.path !== 'string') return null;
  return { bucket: file.bucket, path: file.path };
}

/**
 * Deletes a character and its picture's file (S1-E17-13; the screen asks twice first).
 *
 * @param client - the shared Supabase client
 * @param characterId - the character
 * Errors: throws when the database can't be reached or the character isn't the writer's.
 */
export async function deleteCharacter(client: AppSupabaseClient, characterId: string) {
  const answer = await client.rpc('delete_story_character', { character_id: characterId });
  const data = okAnswer(answer, 'delete the character');
  await deleteStoredPicture(client, fileFrom(data.picture));
}

/**
 * Puts an uploaded picture on a character's sheet, deleting the file of the one it replaces.
 *
 * @param client - the shared Supabase client
 * @param characterId - the character
 * @param pictureId - from uploadAtlasPicture()
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function setCharacterPicture(
  client: AppSupabaseClient,
  characterId: string,
  pictureId: string,
): Promise<void> {
  const answer = await client.rpc('set_character_picture', {
    character_id: characterId,
    new_picture_id: pictureId,
  });
  const data = okAnswer(answer, 'add the picture');
  await deleteStoredPicture(client, fileFrom(data.replaced));
}

/**
 * Takes the picture off a character's sheet and deletes its file (S1-E17-11).
 *
 * @param client - the shared Supabase client
 * @param characterId - the character
 * Errors: throws when the database can't be reached or the character isn't the writer's.
 */
export async function removeCharacterPicture(client: AppSupabaseClient, characterId: string) {
  const answer = await client.rpc('remove_character_picture', { character_id: characterId });
  const data = okAnswer(answer, 'remove the picture');
  await deleteStoredPicture(client, fileFrom(data.removed));
}

/**
 * Adds one of the writer's own fields to every sheet in the story (S1-E17-10).
 *
 * @param client - the shared Supabase client
 * @param slug - the story's address
 * @param name - the field's name, such as "Turned by"
 * Errors: throws when the database refuses it (40 fields already, an empty name) or can't be
 *   reached.
 */
export async function addCharacterField(client: AppSupabaseClient, slug: string, name: string) {
  const answer = await client.rpc('add_character_field', { story_slug: slug, field_name: name });
  okAnswer(answer, 'add the field');
}

/**
 * Renames, removes (hides, keeping its values) or brings back one of the writer's own fields.
 *
 * @param client - the shared Supabase client
 * @param fieldId - the field
 * @param change - { name } or { is_hidden }
 * Errors: throws when the database refuses it or can't be reached.
 */
export async function updateCharacterField(
  client: AppSupabaseClient,
  fieldId: string,
  change: { name: string } | { is_hidden: boolean },
): Promise<void> {
  const answer = await client.rpc('update_character_field', { field_id: fieldId, changes: change });
  okAnswer(answer, 'change the field');
}

/** What a new relationship needs (S1-E17-14). */
export interface NewRelationship {
  fromId: string;
  toId: string;
  kind: RelationshipKind;
  /** Only for a custom relationship, with the optional reverse (G10b). */
  customLabel: string;
  reverseLabel: string;
  /** Only for a cousin (G10b). */
  cousinDegree: number | null;
  cousinRemoved: number | null;
  note: string;
}

/**
 * Records how two of the writer's characters are connected (S1-E17-14).
 *
 * @param client - the shared Supabase client
 * @param relationship - the two characters, the type, the labels, the cousin's degree and the note
 * Errors: throws when the database refuses it (the same character twice, a custom type with no
 *   label) or can't be reached.
 */
export async function addRelationship(
  client: AppSupabaseClient,
  relationship: NewRelationship,
): Promise<void> {
  const answer = await client.rpc('add_character_relationship', {
    from_character_id: relationship.fromId,
    to_character_id: relationship.toId,
    relationship_kind: relationship.kind,
    custom_label: relationship.customLabel,
    note: relationship.note,
    reverse_label: relationship.reverseLabel,
    cousin_degree: relationship.cousinDegree ?? undefined,
    cousin_removed: relationship.cousinRemoved ?? undefined,
  });
  okAnswer(answer, 'add the relationship');
}

/**
 * Deletes one of the writer's relationships (S1-E17-14; the screen asks twice first).
 *
 * @param client - the shared Supabase client
 * @param relationshipId - the relationship
 * Errors: throws when the database can't be reached or the relationship isn't the writer's.
 */
export async function deleteRelationship(client: AppSupabaseClient, relationshipId: string) {
  const answer = await client.rpc('delete_character_relationship', {
    relationship_id: relationshipId,
  });
  okAnswer(answer, 'delete the relationship');
}
