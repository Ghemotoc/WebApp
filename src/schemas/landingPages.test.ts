/**
 * Unit tests for the landing page link rule (story S1-E11-34; bundle CMS-2b break test).
 */
import { describe, expect, it } from 'vitest';

import { safeLandingLink } from './landingPages';

describe('a landing block’s link', () => {
  it('keeps one of our pages and an https address', () => {
    expect(safeLandingLink('/help/contest-rules')).toBe('/help/contest-rules');
    expect(safeLandingLink(' https://example.com/rules ')).toBe('https://example.com/rules');
  });

  it('draws nothing dangerous for a script, plain http or another site written as //host', () => {
    expect(safeLandingLink('javascript:alert(1)')).toBe('#');
    expect(safeLandingLink('http://example.com')).toBe('#');
    expect(safeLandingLink('//3232235777')).toBe('#');
    expect(safeLandingLink(undefined)).toBe('#');
  });
});
