/**
 * Tests for the content path helpers (story S1-E11-06).
 */
import { describe, expect, it } from 'vitest';

import { labelPartsOf, textAt, withTextAt } from './contentPaths';

const page = { lede: 'Hello', points: ['a', 'b', 'c'], whyCards: [{ title: 'One', body: 'x' }] };

describe('content paths', () => {
  it('reads a field inside a list', () => {
    expect(textAt(page, 'points.1')).toBe('b');
    expect(textAt(page, 'whyCards.0.title')).toBe('One');
    expect(textAt(page, 'missing.0')).toBe('');
  });

  it('changes a copy and leaves the original alone', () => {
    const changed = withTextAt(page, 'whyCards.0.body', 'new');
    expect(textAt(changed, 'whyCards.0.body')).toBe('new');
    expect(textAt(page, 'whyCards.0.body')).toBe('x');
  });

  it('names a field by its words and its number', () => {
    expect(labelPartsOf('whyCards.2.title')).toEqual({ labelKey: 'whyCards.title', number: 3 });
    expect(labelPartsOf('lede')).toEqual({ labelKey: 'lede', number: null });
  });
});
