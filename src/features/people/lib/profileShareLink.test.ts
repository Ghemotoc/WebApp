/**
 * Tests for the profile's share link (bundle 3 of the user stories, board C04: "Share").
 */
import { describe, expect, it } from 'vitest';

import { profileShareLink } from './profileShareLink';

describe('profileShareLink', () => {
  it('links to the profile by username, with nothing added', () => {
    expect(profileShareLink('inkwolf', 'https://example.com/')).toBe(
      'https://example.com/u/inkwolf',
    );
  });

  it('keeps an unusual username safe in the address', () => {
    expect(profileShareLink('ana pop', 'https://example.com')).toBe(
      'https://example.com/u/ana%20pop',
    );
  });
});
