/**
 * Unit tests for the password strength meter's scale (bundle G3). Who runs it: `npm test`.
 */
import { describe, expect, it } from 'vitest';

import { passwordStrength } from './passwordStrength';

describe('passwordStrength', () => {
  it('shows nothing for an empty field', () => {
    expect(passwordStrength('')).toBeNull();
  });

  it('calls anything under 10 characters weak', () => {
    expect(passwordStrength('Ab1!xyz')).toBe('weak');
  });

  it('calls one character repeated weak, however long', () => {
    expect(passwordStrength('aaaaaaaaaaaaaaaaaaaaaaaa')).toBe('weak');
  });

  it('rates by length: fair, strong, very strong', () => {
    expect(passwordStrength('lanternfox')).toBe('fair');
    expect(passwordStrength('lanternfoxriver')).toBe('strong');
    expect(passwordStrength('lanternfoxriverstone')).toBe('very-strong');
  });

  it('moves one step up for three kinds of characters', () => {
    expect(passwordStrength('Lantern-fox1')).toBe('strong');
  });

  it('counts Romanian letters as letters', () => {
    expect(passwordStrength('Ștefan-și-țara')).toBe('very-strong');
  });
});
