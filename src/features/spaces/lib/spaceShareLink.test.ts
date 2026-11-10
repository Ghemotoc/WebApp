/**
 * Tests for a space's share link (bundle GAPS-10).
 */
import { describe, expect, it } from 'vitest';

import { spaceShareLink } from './spaceShareLink';

describe('spaceShareLink', () => {
  it('is the space page’s address with nothing added', () => {
    expect(spaceShareLink('fantasy-writers-circle', 'https://example.com/')).toBe(
      'https://example.com/spaces/fantasy-writers-circle',
    );
  });

  it('carries no query string, so no sharer and no tracking code', () => {
    expect(spaceShareLink('poets', 'https://example.com')).not.toContain('?');
  });
});
