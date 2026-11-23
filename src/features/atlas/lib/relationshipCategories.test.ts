/**
 * Tests for the relationship map's categories (story S1-E17-15). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { relationshipKinds } from '../api/characters';

import {
  categoryOf,
  lineShapes,
  lineStyleOf,
  relationshipCategories,
  swatchOf,
  toRelationshipColours,
} from './relationshipCategories';

describe('categoryOf', () => {
  it('puts parents and partners in family, makers in lineage and killers in conflict', () => {
    expect(categoryOf('parent_of')).toBe('family');
    expect(categoryOf('partner_of')).toBe('family');
    expect(categoryOf('made')).toBe('lineage');
    expect(categoryOf('killed')).toBe('conflict');
    expect(categoryOf('custom')).toBe('other');
  });

  it('gives every type a category', () => {
    for (const kind of relationshipKinds)
      expect(relationshipCategories).toContain(categoryOf(kind));
  });
});

describe('lineShapes', () => {
  it('draws family and allies solid, love and other dotted and conflict dashed (CALM-9, E25)', () => {
    expect(lineShapes.family.dashes).toBe('');
    expect(lineShapes.allies.dashes).toBe('');
    expect(lineShapes.love.dashes).toBe(lineShapes.other.dashes);
    expect(lineShapes.conflict.dashes).not.toBe(lineShapes.love.dashes);
    expect(lineShapes.conflict.dashes).not.toBe('');
  });

  it('never draws two categories alike in both default colour and line style', () => {
    const looks = relationshipCategories.map(
      (category) => `${swatchOf(category, {})} ${lineShapes[category].dashes}`,
    );
    expect(new Set(looks).size).toBe(relationshipCategories.length);
  });
});

describe('the colours a writer picks (CALM-9, board E25)', () => {
  it('draws a category in its default colour until the writer picks another', () => {
    expect(swatchOf('family', {})).toBe('blue');
    expect(swatchOf('conflict', {})).toBe('orange');
    expect(swatchOf('family', { family: 'green' })).toBe('green');
    expect(lineStyleOf('love', { love: 'red' }).colour).toBe('var(--atlas-swatch-red)');
  });

  it('keeps only known categories and swatches from the database', () => {
    expect(toRelationshipColours({ family: 'green', rivals: 'red', love: 'teal' })).toEqual({
      family: 'green',
    });
    expect(toRelationshipColours(null)).toEqual({});
  });
});
