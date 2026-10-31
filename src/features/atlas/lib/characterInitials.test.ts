/**
 * Tests for characterInitials (story S1-E17-11). Run by `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { characterInitials } from './characterInitials';

describe('characterInitials', () => {
  it('takes the first letters of the first and last words', () => {
    expect(characterInitials('Ana Maria Mureșan')).toBe('AM');
  });

  it('keeps Romanian letters', () => {
    expect(characterInitials('ștefan țăranu')).toBe('ȘȚ');
  });

  it('shows one letter for a one-word name', () => {
    expect(characterInitials('Vali')).toBe('V');
  });

  it('skips words that start with something other than a letter', () => {
    expect(characterInitials('“Doctor” 42')).toBe('?');
    expect(characterInitials('  ')).toBe('?');
  });
});
