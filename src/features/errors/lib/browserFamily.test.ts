/**
 * Tests for naming the browser family from a user agent (story S1-E1-05): only the family is
 * kept, never the version or the rest of the user agent.
 */
import { describe, expect, it } from 'vitest';

import { browserFamily } from './browserFamily';

describe('browserFamily', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36', 'chrome'],
    [
      'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36 Edg/130.0',
      'edge',
    ],
    [
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 OPR/114.0',
      'opera',
    ],
    [
      'Mozilla/5.0 (Linux; Android 14) SamsungBrowser/26.0 Chrome/122.0 Mobile Safari/537.36',
      'samsung_internet',
    ],
    [
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:131.0) Gecko/20100101 Firefox/131.0',
      'firefox',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1',
      'safari',
    ],
    ['curl/8.4.0', 'other'],
  ])('names %s as %s', (userAgent, family) => {
    expect(browserFamily(userAgent)).toBe(family);
  });
});
