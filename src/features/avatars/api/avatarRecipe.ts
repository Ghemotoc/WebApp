/**
 * The avatar in the database (bundle ADMIN-2, part g; the initials colour from bundle G11a): read
 * a profile's look (its drawn avatar and initials colour), save or clear one's own.
 *
 * Who calls it: hooks/useAvatarRecipe.ts. What it calls next: profile_avatar_look(),
 * set_my_avatar_recipe() (…_admin2_g_avatar_builder.sql), which check the recipe's shape, and
 * set_my_initials_colour() (…_g11a_initials_colour.sql).
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { avatarRecipeSchema, type AvatarRecipe } from '@/schemas/avatarRecipe';

import { isBeadColourName, type BeadColourName } from '../lib/beadColours';

/** What a round avatar needs for one profile. */
export interface AvatarLook {
  /** The drawn avatar, or null for the initials. */
  recipe: AvatarRecipe | null;
  /** The colour the person picked for their initials, or null to take it from the username. */
  initialsColour: BeadColourName | null;
}

/** Why saving failed, for a plain message. */
export type AvatarSaveFailure = 'not_allowed' | 'invalid' | 'unreachable';

/** The error a refused save throws. */
export class AvatarSaveError extends Error {
  constructor(public readonly failure: AvatarSaveFailure) {
    super(`The avatar was not saved: ${failure}`);
  }
}

/** The look of a profile with nothing chosen: the initials, coloured from the username. */
export const plainAvatarLook: AvatarLook = { recipe: null, initialsColour: null };

/**
 * A profile's look: its drawn avatar and initials colour.
 *
 * @param client - the shared Supabase client
 * @param handle - the username, without "@"
 * @returns the look; anything that isn't a recipe or a known colour reads as nothing chosen
 * @throws Error when the database can't be reached
 */
export async function fetchAvatarLook(
  client: AppSupabaseClient,
  handle: string,
): Promise<AvatarLook> {
  const { data, error } = await client.rpc('profile_avatar_look', { profile_handle: handle });
  if (error !== null) throw new Error(`Could not read the avatar: ${error.message}`);
  // Step 1: no such profile (or one moderation hid): the plain initials.
  if (data === null || typeof data !== 'object' || Array.isArray(data)) return plainAvatarLook;
  // Step 2: each half on its own, so a bad recipe never loses a good colour.
  const parsedRecipe = avatarRecipeSchema.safeParse(data.recipe);
  const colour = data.initials_colour;
  return {
    recipe: parsedRecipe.success ? parsedRecipe.data : null,
    initialsColour: typeof colour === 'string' && isBeadColourName(colour) ? colour : null,
  };
}

/**
 * Saves the signed-in person's recipe, or clears it.
 *
 * @param client - the shared Supabase client
 * @param recipe - the recipe, or null to go back to the initials
 * @throws AvatarSaveError: not_allowed for an account that may not change its profile now,
 *   invalid for a recipe the database refuses, unreachable otherwise
 */
export async function saveMyAvatarRecipe(
  client: AppSupabaseClient,
  recipe: AvatarRecipe | null,
): Promise<void> {
  const { error } = await client.rpc('set_my_avatar_recipe', { recipe });
  if (error === null) return;
  if (error.code === '42501') throw new AvatarSaveError('not_allowed');
  if (error.code === '23514') throw new AvatarSaveError('invalid');
  throw new AvatarSaveError('unreachable');
}

/**
 * Saves the colour of the signed-in person's initials bead, or goes back to the username's.
 *
 * @param client - the shared Supabase client
 * @param colour - one of the sixteen bead names, or null
 * @throws AvatarSaveError: not_allowed for an account that may not change its profile now,
 *   invalid for a colour the database refuses, unreachable otherwise
 */
export async function saveMyInitialsColour(
  client: AppSupabaseClient,
  colour: BeadColourName | null,
): Promise<void> {
  const { error } = await client.rpc('set_my_initials_colour', {
    // The generated type says string, but the function takes null for "from the username".
    colour: colour as string,
  });
  if (error === null) return;
  if (error.code === '42501') throw new AvatarSaveError('not_allowed');
  if (error.code === '23514') throw new AvatarSaveError('invalid');
  throw new AvatarSaveError('unreachable');
}
