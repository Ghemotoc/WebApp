/**
 * Unit tests for the family words (bundle GAPS-3): mother, father, daughter, son, sister and
 * brother follow the character's gender; "they" and not set keep the neutral words.
 */
import { describe, expect, it } from 'vitest';

import { familyWording } from './familyWords';

describe('familyWording', () => {
  it('a woman who is a parent is the mother', () => {
    expect(
      familyWording({ kind: 'parent_of', fromGender: 'she', toGender: null, isFromSecond: false }),
    ).toEqual({ sentenceKey: 'parent_of_she', isFlipped: false });
  });

  it('a man who is a parent is the father', () => {
    expect(
      familyWording({ kind: 'parent_of', fromGender: 'he', toGender: 'she', isFromSecond: false }),
    ).toEqual({ sentenceKey: 'parent_of_he', isFlipped: false });
  });

  it('a parent with no gender set, or "they", stays the parent', () => {
    for (const fromGender of [null, 'they'] as const) {
      expect(
        familyWording({ kind: 'parent_of', fromGender, toGender: 'he', isFromSecond: false }),
      ).toEqual({ sentenceKey: 'parent_of', isFlipped: false });
    }
  });

  it('on the child’s own sheet a girl is the daughter, with her name first', () => {
    expect(
      familyWording({ kind: 'parent_of', fromGender: 'he', toGender: 'she', isFromSecond: true }),
    ).toEqual({ sentenceKey: 'child_of_she', isFlipped: true });
  });

  it('on the child’s own sheet a child with no gender set is the child', () => {
    expect(
      familyWording({ kind: 'parent_of', fromGender: 'she', toGender: null, isFromSecond: true }),
    ).toEqual({ sentenceKey: 'child_of', isFlipped: true });
  });

  it('a sibling takes the word of whoever the sentence starts with', () => {
    expect(
      familyWording({ kind: 'sibling_of', fromGender: 'she', toGender: 'he', isFromSecond: false }),
    ).toEqual({ sentenceKey: 'sibling_of_she', isFlipped: false });
    expect(
      familyWording({ kind: 'sibling_of', fromGender: 'she', toGender: 'he', isFromSecond: true }),
    ).toEqual({ sentenceKey: 'sibling_of_he', isFlipped: true });
  });

  it('every other type keeps its one sentence, whatever the genders', () => {
    expect(
      familyWording({ kind: 'partner_of', fromGender: 'she', toGender: 'he', isFromSecond: true }),
    ).toEqual({ sentenceKey: 'partner_of', isFlipped: false });
    expect(
      familyWording({ kind: 'mentors', fromGender: 'he', toGender: null, isFromSecond: false }),
    ).toEqual({ sentenceKey: 'mentors', isFlipped: false });
  });
});
