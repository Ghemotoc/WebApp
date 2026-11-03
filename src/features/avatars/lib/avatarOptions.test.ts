/**
 * Unit tests for the avatar builder's choices, Surprise me and the drawing options (bundle
 * ADMIN-2, part g).
 */
import { describe, expect, it } from 'vitest';

import englishAvatars from '@/locales/en/avatars.json';
import romanianAvatars from '@/locales/ro/avatars.json';
import { avatarRecipeSchema } from '@/schemas/avatarRecipe';

import { avatarChoices, avatarParts, startingRecipe } from './avatarOptions';
import { openPeepsOptionsOf } from './drawAvatar';
import { randomRecipe } from './randomRecipe';

/** The label of one choice in a locale file, or undefined. */
function labelOf(file: Record<string, unknown>, part: string, value: string): unknown {
  const group = file[part];
  return typeof group === 'object' && group !== null
    ? (group as Record<string, unknown>)[value]
    : undefined;
}

describe('the avatar builder', () => {
  it('names every choice in English and Romanian, and nothing else', () => {
    for (const part of avatarParts) {
      for (const value of avatarChoices[part]) {
        expect(labelOf(englishAvatars, part, value), `${part}.${value}`).toBeTypeOf('string');
        expect(labelOf(romanianAvatars, part, value), `${part}.${value}`).toBeTypeOf('string');
      }
      expect(Object.keys(englishAvatars[part]).sort()).toEqual([...avatarChoices[part]].sort());
    }
  });

  it('starts from a valid recipe with no facial hair, so nothing assumes a gender', () => {
    expect(avatarRecipeSchema.parse(startingRecipe)).toEqual(startingRecipe);
    expect(startingRecipe.facialHair).toBe('none');
  });

  it('makes a valid recipe from the offered choices every time it surprises', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const recipe = randomRecipe();
      expect(avatarRecipeSchema.safeParse(recipe).success).toBe(true);
      for (const part of avatarParts) expect(avatarChoices[part]).toContain(recipe[part]);
    }
  });

  it('draws exactly the chosen parts, and "none" draws nothing', () => {
    const options = openPeepsOptionsOf({ ...startingRecipe, accessory: 'glasses' });
    expect(options.head).toEqual(['medium1']);
    expect(options.facialHairProbability).toBe(0);
    expect(options.accessories).toEqual(['glasses']);
    expect(options.accessoriesProbability).toBe(100);
    expect(options.backgroundColor).toEqual(['f1eaf4']);
  });

  it('falls back to the starting part for a value the builder does not offer', () => {
    const options = openPeepsOptionsOf({ ...startingRecipe, head: 'bear' });
    expect(options.head).toEqual(['medium1']);
  });
});
