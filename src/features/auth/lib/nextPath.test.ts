/**
 * Unit tests for the page a log-in opens next (bundle DASH-1).
 *
 * Who runs it: `npm test`.
 * What it proves: the log-in page follows `next` only to a page on this site, so a written-up
 * address can never send someone who just logged in to another website.
 */
import { describe, expect, it } from 'vitest';

import { pathAfterSignIn } from './nextPath';

describe('pathAfterSignIn', () => {
  it('goes back to the admin site after a staff member signs in again', () => {
    expect(pathAfterSignIn('/staff')).toBe('/staff');
  });

  it('keeps a page address with its query', () => {
    expect(pathAfterSignIn('/write?tab=drafts')).toBe('/write?tab=drafts');
  });

  it('goes home when the address names no page', () => {
    expect(pathAfterSignIn(null)).toBe('/');
    expect(pathAfterSignIn('')).toBe('/');
  });

  it('never goes to another website', () => {
    expect(pathAfterSignIn('https://other.example')).toBe('/');
    expect(pathAfterSignIn('//other.example')).toBe('/');
    expect(pathAfterSignIn('/\\other.example')).toBe('/');
    expect(pathAfterSignIn('/\t/other.example')).toBe('/');
    expect(pathAfterSignIn('javascript:alert(1)')).toBe('/');
  });
});
