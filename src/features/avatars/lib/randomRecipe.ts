/**
 * "Surprise me": a random avatar from the builder's choices (bundle ADMIN-2, part g).
 *
 * Facial hair and accessories come up only now and then (one time in four), so most surprises
 * show the face plainly. Who calls it: AvatarBuilderSection. What it calls: nothing.
 */
import type { AvatarRecipe } from '@/schemas/avatarRecipe';

import { avatarChoices } from './avatarOptions';

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
    style: 'open-peeps',
    version: 1,
    skin: pick(avatarChoices.skin, random),
    head: pick(avatarChoices.head, random),
    hairColour: pick(avatarChoices.hairColour, random),
    expression: pick(avatarChoices.expression, random),
    facialHair: pickSometimes(avatarChoices.facialHair, random),
    accessory: pickSometimes(avatarChoices.accessory, random),
    clothes: pick(avatarChoices.clothes, random),
    background: pick(avatarChoices.background, random),
  };
}
