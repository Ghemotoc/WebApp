/**
 * Draws a recipe as an SVG picture, in the browser (bundle ADMIN-2, part g; Robert's brief of
 * 2 Nov 2026, section 7: "drawn in the browser as SVG"; bundle AVATAR-1: the Micah art).
 *
 * The art is DiceBear's Micah (@dicebear/micah: "Avatar Illustration System" by Micah Lanier,
 * art CC BY 4.0, code MIT; ADR 0016). DiceBear writes the credit and the licence into every
 * drawn SVG's metadata, and the editor shows the credit under it (CC BY 4.0 asks for credit).
 * The art is loaded only when an avatar is first drawn, so pages without one never download it.
 * A value the builder doesn't offer (a hand-made recipe) is replaced by the starting recipe's,
 * so the drawing only ever uses the art's own parts and the recipe's checked hex colours.
 * Every avatar is drawn close up (Robert, 6 Nov 2026: "Close Up"), so the face reads at comment
 * size.
 * Who calls it: hooks/useAvatarDrawing.ts. What it calls: DiceBear's createAvatar().
 */
import type { Options as MicahOptions } from '@dicebear/micah';

import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, startingRecipe, type AvatarPart } from './avatarOptions';

/** How far the close-up zooms in (per cent) and how far it moves down (per cent of the size). */
const closeUp = { scale: 140, translateY: 12 } as const;

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
 * One optional part (glasses, earrings, facial hair): "none" draws nothing, any other choice is
 * always drawn.
 *
 * @returns the part's list and its probability, as DiceBear wants them
 */
function optionalPart(recipe: AvatarRecipe, part: 'glasses' | 'earrings' | 'facialHair') {
  const value = offeredValue(recipe, part);
  return value === 'none' ? { list: [], probability: 0 } : { list: [value], probability: 100 };
}

/** One of the art's own part names; the values come from avatarChoices, which lists only those. */
type PartOf<Key extends keyof MicahOptions> =
  NonNullable<MicahOptions[Key]> extends (infer Item)[] ? Item : never;

/**
 * DiceBear's options for a recipe: exactly one choice per part, nothing left to chance.
 *
 * @param recipe - a checked recipe
 * @returns the Micah options, close up
 */
export function micahOptionsOf(recipe: AvatarRecipe): MicahOptions & {
  backgroundColor: string[];
  scale: number;
  translateY: number;
} {
  const glasses = optionalPart(recipe, 'glasses');
  const earrings = optionalPart(recipe, 'earrings');
  const facialHair = optionalPart(recipe, 'facialHair');
  const extrasColour = offeredValue(recipe, 'extrasColour');
  const hairColour = offeredValue(recipe, 'hairColour');
  // The part names come from avatarChoices, so these narrowing casts can't let anything else in.
  return {
    baseColor: [offeredValue(recipe, 'skin')],
    hair: [offeredValue(recipe, 'hair') as PartOf<'hair'>],
    hairColor: [hairColour],
    hairProbability: 100,
    eyebrows: [offeredValue(recipe, 'eyebrows') as PartOf<'eyebrows'>],
    eyes: [offeredValue(recipe, 'eyes') as PartOf<'eyes'>],
    mouth: [offeredValue(recipe, 'mouth') as PartOf<'mouth'>],
    nose: [offeredValue(recipe, 'nose') as PartOf<'nose'>],
    ears: ['attached'],
    // A beard takes the hair's colour, so the two always match.
    facialHair: facialHair.list as PartOf<'facialHair'>[],
    facialHairProbability: facialHair.probability,
    facialHairColor: [hairColour],
    glasses: glasses.list as PartOf<'glasses'>[],
    glassesProbability: glasses.probability,
    glassesColor: [extrasColour],
    earrings: earrings.list as PartOf<'earrings'>[],
    earringsProbability: earrings.probability,
    earringColor: [extrasColour],
    shirt: [offeredValue(recipe, 'shirt') as PartOf<'shirt'>],
    shirtColor: [offeredValue(recipe, 'shirtColour')],
    backgroundColor: [offeredValue(recipe, 'background')],
    ...closeUp,
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
  const [core, micah] = await Promise.all([import('@dicebear/core'), import('@dicebear/micah')]);
  // Step 2: a fixed seed, so the same recipe always draws the same picture.
  return core.createAvatar(micah, { seed: 'avatar', ...micahOptionsOf(recipe) }).toDataUri();
}
