/**
 * Tests for turning a page's address into its route pattern (story S1-E1-05), so an error report
 * never carries an invite code or anything typed into the address.
 */
import { describe, expect, it } from 'vitest';

import { routePattern } from './routePattern';

describe('routePattern', () => {
  it('keeps a page without parameters as it is', () => {
    expect(routePattern('/sign-in', {})).toBe('/sign-in');
    expect(routePattern('/', {})).toBe('/');
  });

  it('replaces an invite code with the parameter name', () => {
    expect(routePattern('/join/AB12CD', { code: 'AB12CD' })).toBe('/join/:code');
  });

  it('replaces an encoded value too', () => {
    expect(routePattern('/legal/ter%20ms', { documentSlug: 'ter ms' })).toBe(
      '/legal/:documentSlug',
    );
  });

  it('turns everything a "page not found" address matched into one :unknown', () => {
    expect(routePattern('/my/old-story-title', { '*': 'my/old-story-title' })).toBe('/:unknown');
  });
});
