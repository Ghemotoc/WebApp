/**
 * AvatarImage: a profile's drawn avatar over its initials, or nothing (bundle ADMIN-2, part g;
 * replaces the uploaded profile picture of S1-E10-05: avatars are built or initials only, Robert,
 * 2 Nov 2026).
 *
 * Decorative, like the initials: the name is always written beside it.
 * Who uses it: ProfileAvatar (profile header) and ChatAvatar (messages). What it calls:
 * useAvatarRecipe, AvatarDrawing.
 */
import { useAvatarRecipe } from '../hooks/useAvatarRecipe';

import { AvatarDrawing } from './AvatarDrawing';

/**
 * Renders the drawing filling its round parent, or nothing for the initials.
 *
 * @param props.handle - the username, without "@"
 * @returns the drawing, or null
 */
export function AvatarImage({ handle }: { handle: string }) {
  const recipe = useAvatarRecipe(handle);
  if (recipe.data === undefined || recipe.data === null) return null;
  return <AvatarDrawing recipe={recipe.data} className="absolute inset-0 size-full" />;
}
