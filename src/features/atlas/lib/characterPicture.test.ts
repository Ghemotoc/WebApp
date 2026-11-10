/**
 * Tests for lib/characterPicture.ts: a character's picture shows only once it passed its check
 * (story S1-E17-11; bundle G10a: no initials, the name stands alone).
 */
import { describe, expect, it } from 'vitest';

import { visiblePictureUrl } from './characterPicture';

describe('visiblePictureUrl', () => {
  it('gives the address of a picture that passed its check', () => {
    expect(
      visiblePictureUrl({ picture: { state: 'visible', url: 'https://example.test/a.webp' } }),
    ).toBe('https://example.test/a.webp');
  });

  it('gives nothing while the picture is being checked', () => {
    expect(visiblePictureUrl({ picture: { state: 'checking', url: null } })).toBeNull();
  });

  it('gives nothing for a character with no picture', () => {
    expect(visiblePictureUrl({ picture: null })).toBeNull();
  });
});
