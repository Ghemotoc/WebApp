/**
 * Tests for the relationship map's categories (story S1-E17-15). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { relationshipKinds } from '../api/characters';

import { categoryOf, lineStyles, relationshipCategories } from './relationshipCategories';

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

describe('lineStyles', () => {
  it('draws each category with its own line style, not colour alone', () => {
    const patterns = relationshipCategories.map((category) => lineStyles[category].dashes);
    expect(new Set(patterns).size).toBe(relationshipCategories.length);
    expect(lineStyles.conflict.dashes).not.toBe('');
    expect(lineStyles.family.dashes).toBe('');
  });
});
