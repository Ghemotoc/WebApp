/**
 * Unit tests for the avatar builder's choices, tabs, Surprise me and the drawing options (bundle
 * ADMIN-2, part g; the Micah art and the visual editor since bundle AVATAR-1).
 */
import { describe, expect, it } from 'vitest';

import englishAvatars from '@/locales/en/avatars.json';
import romanianAvatars from '@/locales/ro/avatars.json';
import { avatarRecipeSchema } from '@/schemas/avatarRecipe';

import {
  avatarChoices,
  avatarParts,
  avatarPartsNotOffered,
  avatarPartsUnderTabs,
  avatarTabs,
  startingRecipe,
} from './avatarOptions';
import { micahOptionsOf } from './drawAvatar';
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

  it('offers every part once, on one tab or under the tabs, except the top nobody sees', () => {
    const onScreen = [...avatarTabs.flatMap((tab) => [...tab.parts]), ...avatarPartsUnderTabs];
    const everyPart = [...onScreen, ...avatarPartsNotOffered];
    expect([...everyPart].sort()).toEqual([...avatarParts].sort());
    expect(new Set(everyPart).size).toBe(everyPart.length);
  });

  it('has no clothes tab and keeps the background colour under every tab', () => {
    expect(avatarTabs.map((tab) => tab.key)).toEqual(['face', 'hair', 'extras']);
    expect(avatarPartsUnderTabs).toEqual(['background']);
    expect(avatarPartsNotOffered).toEqual(['shirt', 'shirtColour']);
  });

  it('starts from a valid recipe with no facial hair, glasses or earrings, so nothing assumes a gender', () => {
    expect(avatarRecipeSchema.parse(startingRecipe)).toEqual(startingRecipe);
    expect(startingRecipe.facialHair).toBe('none');
    expect(startingRecipe.glasses).toBe('none');
    expect(startingRecipe.earrings).toBe('none');
  });

  it('makes a valid recipe from the offered choices every time it surprises, leaving the top alone', () => {
    for (let attempt = 0; attempt < 50; attempt += 1) {
      const recipe = randomRecipe();
      expect(avatarRecipeSchema.safeParse(recipe).success).toBe(true);
      for (const part of avatarParts) expect(avatarChoices[part]).toContain(recipe[part]);
      expect(recipe.shirt).toBe(startingRecipe.shirt);
      expect(recipe.shirtColour).toBe(startingRecipe.shirtColour);
    }
  });

  it('draws exactly the chosen parts, close up, and "none" draws nothing', () => {
    const options = micahOptionsOf({ ...startingRecipe, glasses: 'round', hairColour: '5b7fd6' });
    expect(options.hair).toEqual(['dannyPhantom']);
    expect(options.hairColor).toEqual(['5b7fd6']);
    expect(options.facialHairProbability).toBe(0);
    expect(options.glasses).toEqual(['round']);
    expect(options.glassesProbability).toBe(100);
    expect(options.earringsProbability).toBe(0);
    expect(options.backgroundColor).toEqual(['f1eaf4']);
    expect(options.scale).toBeGreaterThan(100);
  });

  it('gives a beard the hair colour, so the two always match', () => {
    const options = micahOptionsOf({
      ...startingRecipe,
      facialHair: 'beard',
      hairColour: 'c93305',
    });
    expect(options.facialHair).toEqual(['beard']);
    expect(options.facialHairColor).toEqual(['c93305']);
  });

  it('falls back to the starting part for a value the builder does not offer', () => {
    const options = micahOptionsOf({ ...startingRecipe, hair: 'bear' });
    expect(options.hair).toEqual(['dannyPhantom']);
  });
});
