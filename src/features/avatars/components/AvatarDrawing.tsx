/**
 * AvatarDrawing: a recipe drawn as a round picture (bundle ADMIN-2, part g).
 *
 * Who shows it: AvatarImage (over the initials) and AvatarBuilderSection (the live preview).
 * What it calls: useAvatarDrawing. Nothing shows while the art loads, so the initials stay.
 */
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { useAvatarDrawing } from '../hooks/useAvatarDrawing';

/** What the drawing needs. */
export interface AvatarDrawingProps {
  recipe: AvatarRecipe | null;
  /** The text alternative; empty (the default) where the name is written beside it. */
  alt?: string;
  className?: string;
}

/**
 * Renders the picture, or nothing.
 *
 * @returns an <img>, or null
 */
export function AvatarDrawing({ recipe, alt = '', className = '' }: AvatarDrawingProps) {
  const source = useAvatarDrawing(recipe);
  if (source === null) return null;
  return <img src={source} alt={alt} className={`rounded-full ${className}`} />;
}
