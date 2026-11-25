/**
 * Tests for pathAfterSignUp (BOOKS-A10, user story 1.10).
 */
import { afterEach, describe, expect, it } from 'vitest';

import {
  PATH_AFTER_SIGN_UP_KEY,
  rememberPathAfterSignUp,
  takePathAfterSignUp,
} from './pathAfterSignUp';

describe('pathAfterSignUp', () => {
  afterEach(() => localStorage.clear());

  it('a new member who joined from a campaign lands on its page after setup, once', () => {
    rememberPathAfterSignUp('/hub');
    expect(takePathAfterSignUp('/discover')).toBe('/hub');
    expect(takePathAfterSignUp('/discover')).toBe('/discover');
  });

  it('another website is never remembered', () => {
    rememberPathAfterSignUp('//elsewhere.example');
    rememberPathAfterSignUp('https://elsewhere.example');
    expect(localStorage.getItem(PATH_AFTER_SIGN_UP_KEY)).toBeNull();
    expect(takePathAfterSignUp('/discover')).toBe('/discover');
  });

  it('a value changed by hand in storage is checked again', () => {
    localStorage.setItem(PATH_AFTER_SIGN_UP_KEY, '/\\elsewhere.example');
    expect(takePathAfterSignUp('/discover')).toBe('/discover');
  });
});
