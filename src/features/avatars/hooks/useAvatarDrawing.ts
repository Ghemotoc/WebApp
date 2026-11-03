/**
 * useAvatarDrawing: the SVG picture of a recipe (bundle ADMIN-2, part g).
 *
 * Drawing is done once per recipe and kept: the same recipe on many avatars draws once.
 * Who calls it: AvatarDrawing. What it calls: lib/drawAvatar.ts.
 */
import { useQuery } from '@tanstack/react-query';

import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { drawAvatar } from '../lib/drawAvatar';

/**
 * Draws a recipe.
 *
 * @param recipe - the recipe, or null for none
 * @returns the picture's data: address, or null while it is drawn or when there is none
 */
export function useAvatarDrawing(recipe: AvatarRecipe | null): string | null {
  const drawing = useQuery({
    queryKey: ['avatar-drawing', recipe === null ? '' : JSON.stringify(recipe)],
    enabled: recipe !== null,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => (recipe === null ? null : drawAvatar(recipe)),
  });
  return drawing.data ?? null;
}
