/**
 * Draws a recipe as an SVG picture, in the browser (bundle ADMIN-2, part g; Robert's brief of
 * 2 Nov 2026, section 7: "drawn in the browser as SVG").
 *
 * The art is DiceBear's Open Peeps (@dicebear/open-peeps, art CC0, code MIT; ADR 0013). It is
 * loaded only when an avatar is first drawn, so pages without one never download it. A value the
 * builder doesn't offer (an old or hand-made recipe) is replaced by the starting recipe's, so the
 * drawing only ever uses the art's own parts and the recipe's checked hex colours.
 * Who calls it: hooks/useAvatarDrawing.ts. What it calls: DiceBear's createAvatar().
 */
import type { Options as OpenPeepsOptions } from '@dicebear/open-peeps';

import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, startingRecipe, type AvatarPart } from './avatarOptions';

/**
 * The recipe's value for a part when the builder offers it, otherwise the starting value.
 *
 * @returns a value from avatarChoices
 */
function offeredValue(recipe: AvatarRecipe, part: AvatarPart): string {
  const value = recipe[part];
  return avatarChoices[part].includes(value) ? value : startingRecipe[part];
}

/**
 * DiceBear's options for a recipe: exactly one choice per part, nothing left to chance.
 *
 * @param recipe - a checked recipe
 * @returns the Open Peeps options
 */
export function openPeepsOptionsOf(recipe: AvatarRecipe): OpenPeepsOptions & {
  backgroundColor: string[];
} {
  const facialHair = offeredValue(recipe, 'facialHair');
  const accessory = offeredValue(recipe, 'accessory');
  // The part names come from avatarChoices, which lists only the art's own names, so these
  // narrowing casts can't let anything else through.
  return {
    skinColor: [offeredValue(recipe, 'skin')],
    head: [offeredValue(recipe, 'head') as NonNullable<OpenPeepsOptions['head']>[number]],
    headContrastColor: [offeredValue(recipe, 'hairColour')],
    face: [offeredValue(recipe, 'expression') as NonNullable<OpenPeepsOptions['face']>[number]],
    // "none" means the part is never drawn; any other choice is always drawn.
    facialHair:
      facialHair === 'none'
        ? []
        : [facialHair as NonNullable<OpenPeepsOptions['facialHair']>[number]],
    facialHairProbability: facialHair === 'none' ? 0 : 100,
    accessories:
      accessory === 'none'
        ? []
        : [accessory as NonNullable<OpenPeepsOptions['accessories']>[number]],
    accessoriesProbability: accessory === 'none' ? 0 : 100,
    maskProbability: 0,
    clothingColor: [offeredValue(recipe, 'clothes')],
    backgroundColor: [offeredValue(recipe, 'background')],
  };
}

/**
 * Draws the recipe.
 *
 * @param recipe - a checked recipe
 * @returns the picture as a data: address for an <img>
 * Errors: throws only if the art can't be loaded (no connection on a first visit).
 */
export async function drawAvatar(recipe: AvatarRecipe): Promise<string> {
  // Step 1: load the drawing code and the art, once, on first use.
  const [core, openPeeps] = await Promise.all([
    import('@dicebear/core'),
    import('@dicebear/open-peeps'),
  ]);
  // Step 2: a fixed seed, so the same recipe always draws the same picture.
  return core
    .createAvatar(openPeeps, { seed: 'avatar', ...openPeepsOptionsOf(recipe) })
    .toDataUri();
}
