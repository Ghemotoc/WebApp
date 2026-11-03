/**
 * The drawn avatar in the database (bundle ADMIN-2, part g): read a profile's recipe, save or
 * clear one's own.
 *
 * Who calls it: hooks/useAvatarRecipe.ts. What it calls next: profile_avatar_recipe() and
 * set_my_avatar_recipe() (…_admin2_g_avatar_builder.sql), which check the recipe's shape.
 */
import type { AppSupabaseClient } from '@/lib/supabase';
import { avatarRecipeSchema, type AvatarRecipe } from '@/schemas/avatarRecipe';

/** Why saving failed, for a plain message. */
export type AvatarSaveFailure = 'not_allowed' | 'invalid' | 'unreachable';

/** The error a refused save throws. */
export class AvatarSaveError extends Error {
  constructor(public readonly failure: AvatarSaveFailure) {
    super(`The avatar was not saved: ${failure}`);
  }
}

/**
 * A profile's recipe.
 *
 * @param client - the shared Supabase client
 * @param handle - the username, without "@"
 * @returns the recipe, or null for the initials (also for anything that isn't a recipe)
 * @throws Error when the database can't be reached
 */
export async function fetchAvatarRecipe(
  client: AppSupabaseClient,
  handle: string,
): Promise<AvatarRecipe | null> {
  const { data, error } = await client.rpc('profile_avatar_recipe', { profile_handle: handle });
  if (error !== null) throw new Error(`Could not read the avatar: ${error.message}`);
  const parsed = avatarRecipeSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
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
