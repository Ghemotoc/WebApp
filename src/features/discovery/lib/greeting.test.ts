/** Tests for the Discover greeting's choice of words (stories S1-E2-12 and S1-E2-13). */
import { describe, expect, it } from 'vitest';

import { greetingKeyFor } from './greeting';

describe('greetingKeyFor', () => {
  it('says good morning before noon, good afternoon until six and good evening after', () => {
    expect(greetingKeyFor(null, 8)).toBe('greeting.morning');
    expect(greetingKeyFor(null, 12)).toBe('greeting.afternoon');
    expect(greetingKeyFor(null, 18)).toBe('greeting.evening');
  });

  it('wishes a happy birthday on the day, whatever the hour', () => {
    expect(greetingKeyFor('birthday', 22)).toBe('greeting.birthday');
  });

  it('wishes a happy birthday month and a happy anniversary', () => {
    expect(greetingKeyFor('birthday_month', 9)).toBe('greeting.birthdayMonth');
    expect(greetingKeyFor('anniversary', 9)).toBe('greeting.anniversary');
  });
});
