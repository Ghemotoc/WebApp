/**
 * Tests for where a password reset lands (story S1-E2-05).
 */
import { describe, expect, it } from 'vitest';

import { resetPasswordAddress, shouldOpenResetPage } from './passwordRecovery';

describe('where a password reset lands', () => {
  it('the reset email sends the person back to this site’s reset page', () => {
    expect(resetPasswordAddress('https://example.test')).toBe(
      'https://example.test/reset-password',
    );
    expect(resetPasswordAddress('https://example.test/')).toBe(
      'https://example.test/reset-password',
    );
  });

  it('a reset that lands on any other page moves to the reset page, and the reset page stays', () => {
    expect(shouldOpenResetPage('/')).toBe(true);
    expect(shouldOpenResetPage('/hub')).toBe(true);
    expect(shouldOpenResetPage('/reset-password')).toBe(false);
    expect(shouldOpenResetPage('/reset-password/')).toBe(false);
  });
});
