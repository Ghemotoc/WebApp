/**
 * Tests for the certificate helpers (bundle CLASSES, part e; story S1-E8-12): the date in a
 * certificate's language and the teacher's picked results.
 */
import { describe, expect, it } from 'vitest';

import { certificateDate, certificateLanguageOf } from './certificateDate';
import { pickedResults } from './pickedResults';

describe('certificateDate', () => {
  it('writes the date in Romanian on a Romanian certificate', () => {
    expect(certificateDate('2027-06-15T10:00:00Z', 'ro')).toBe('15 iunie 2027');
  });

  it('and in English on an English one', () => {
    expect(certificateDate('2027-06-15T10:00:00Z', 'en')).toBe('15 June 2027');
  });

  it('any page language other than English prints in Romanian', () => {
    expect(certificateLanguageOf('fr')).toBe('ro');
    expect(certificateLanguageOf('en')).toBe('en');
  });
});

describe('pickedResults', () => {
  it('a student left on "No certificate" gets none', () => {
    expect(pickedResults({ ana: 'winner', ion: '', mara: 'participant' })).toEqual([
      { handle: 'ana', result: 'winner' },
      { handle: 'mara', result: 'participant' },
    ]);
  });
});
