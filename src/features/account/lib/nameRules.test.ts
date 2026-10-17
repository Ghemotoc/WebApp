/**
 * Tests for the quick username and pen name rules (story S1-E2-04). The database applies the same
 * rules and more (supabase/tests/database/025-usernames.test.sql).
 */
import { describe, expect, it } from 'vitest';

import {
  countCharacters,
  displayName,
  hasInvisibleCharacters,
  nextChangeDate,
  quickHandleProblem,
  quickPenNameProblem,
  toHandleOutcome,
} from './nameRules';

describe('quick username rules', () => {
  it('counts an emoji as one character, like the database', () => {
    expect(countCharacters('ab👩')).toBe(3);
    expect(quickHandleProblem('ab👩')).toBeNull();
  });

  it('a username must be 3 to 30 characters', () => {
    expect(quickHandleProblem('ab')).toBe('too_short');
    expect(quickHandleProblem('a'.repeat(31))).toBe('too_long');
    expect(quickHandleProblem('lia.writes')).toBeNull();
  });

  it('refuses invisible characters used to fake names, but keeps joined emoji', () => {
    expect(hasInvisibleCharacters('lia\u200Bwrites')).toBe(true);
    expect(hasInvisibleCharacters('lia\u202Ewrites')).toBe(true);
    expect(hasInvisibleCharacters('lia\u200Dwrites')).toBe(true);
    expect(hasInvisibleCharacters('ana👩\u200D💻')).toBe(false);
    expect(hasInvisibleCharacters('❤\uFE0Fana')).toBe(false);
  });

  it('a username has no spaces of any kind', () => {
    expect(quickHandleProblem('lia writes')).toBe('spaces');
    expect(quickHandleProblem('lia\u00A0writes')).toBe('spaces');
  });

  it('letters with diacritics and other scripts are fine', () => {
    expect(quickHandleProblem('Ștefan')).toBeNull();
    expect(quickHandleProblem('Мария')).toBeNull();
  });
});

describe('quick pen name rules', () => {
  it('a pen name may have spaces but no more than 50 characters', () => {
    expect(quickPenNameProblem('Lia Scrie')).toBeNull();
    expect(quickPenNameProblem('a'.repeat(51))).toBe('too_long');
  });

  it('an empty pen name means no pen name, which is fine', () => {
    expect(quickPenNameProblem('')).toBeNull();
  });
});

describe('the database answer', () => {
  it('accepts every known outcome and refuses anything else', () => {
    expect(toHandleOutcome('taken')).toBe('taken');
    expect(() => toHandleOutcome('something_new')).toThrow('Unexpected answer');
  });
});

describe('the name shown on content', () => {
  it('shows the pen name when there is one, otherwise the username', () => {
    expect(displayName('lia.writes', 'Lia Scrie')).toBe('Lia Scrie');
    expect(displayName('lia.writes', null)).toBe('lia.writes');
    expect(displayName('lia.writes', '   ')).toBe('lia.writes');
  });
});

describe('when a name may change again', () => {
  const now = new Date('2026-11-10T12:00:00Z');

  it('a name never changed since setup may change now', () => {
    expect(nextChangeDate(null, 30, now)).toBeNull();
  });

  it('a name changed 10 days ago may change again 20 days from now', () => {
    expect(nextChangeDate('2026-10-31T12:00:00Z', 30, now)?.toISOString()).toBe(
      '2026-11-30T12:00:00.000Z',
    );
  });

  it('a name changed 40 days ago may change now', () => {
    expect(nextChangeDate('2026-10-01T12:00:00Z', 30, now)).toBeNull();
  });
});
