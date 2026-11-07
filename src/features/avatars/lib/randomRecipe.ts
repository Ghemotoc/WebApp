/**
 * "Surprise me": a random avatar from the builder's choices (bundle ADMIN-2, part g; the Micah
 * parts since bundle AVATAR-1).
 *
 * Facial hair, glasses and earrings come up only now and then (one time in four each), so most
 * surprises show the face plainly. The top and its colour, which the editor no longer offers
 * (Robert, 7 Nov 2026), stay the starting ones, so a surprise never changes what nobody can pick.
 * Who calls it: useAvatarDraft. What it calls: nothing.
 */
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices, startingRecipe } from './avatarOptions';

/** A number from 0 (included) to 1 (excluded); Math.random by default, fixed in tests. */
export type RandomNumber = () => number;

/**
 * One random item of a list.
 *
 * @returns the item
 */
function pick(list: readonly string[], random: RandomNumber): string {
  return list[Math.floor(random() * list.length)] ?? list[0] ?? '';
}

/**
 * An optional part: "none" three times in four, otherwise one of the others.
 *
 * @returns the chosen value
 */
function pickSometimes(list: readonly string[], random: RandomNumber): string {
  if (random() < 0.75) return 'none';
  return pick(
    list.filter((value) => value !== 'none'),
    random,
  );
}

/**
 * Makes a random recipe.
 *
 * @param random - where the randomness comes from (Math.random unless a test passes its own)
 * @returns a recipe the database accepts
 */
export function randomRecipe(random: RandomNumber = Math.random): AvatarRecipe {
  return {
    style: 'micah',
    version: 1,
    skin: pick(avatarChoices.skin, random),
    hair: pick(avatarChoices.hair, random),
    hairColour: pick(avatarChoices.hairColour, random),
    eyebrows: pick(avatarChoices.eyebrows, random),
    eyes: pick(avatarChoices.eyes, random),
    mouth: pick(avatarChoices.mouth, random),
    nose: pick(avatarChoices.nose, random),
    facialHair: pickSometimes(avatarChoices.facialHair, random),
    glasses: pickSometimes(avatarChoices.glasses, random),
    earrings: pickSometimes(avatarChoices.earrings, random),
    extrasColour: pick(avatarChoices.extrasColour, random),
    shirt: startingRecipe.shirt,
    shirtColour: startingRecipe.shirtColour,
    background: pick(avatarChoices.background, random),
  };
}
