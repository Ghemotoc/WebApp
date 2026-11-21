/**
 * Tests for the details a bug report carries (TRIAL-FEEDBACK, lib/pageContext.ts).
 */
import { describe, expect, it } from 'vitest';

import { currentPageContext, describeBrowser } from './pageContext';

describe('describeBrowser', () => {
  it('names Firefox on Windows with its major version only', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0';
    expect(describeBrowser(userAgent)).toBe('Firefox 133 on Windows');
  });

  it('tells Edge apart from the Chrome it is built on', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0';
    expect(describeBrowser(userAgent)).toBe('Edge 131 on Windows');
  });

  it('names Safari on a Mac', () => {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
    expect(describeBrowser(userAgent)).toBe('Safari 18 on macOS');
  });

  it('says an iPhone is iOS, not macOS', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
    expect(describeBrowser(userAgent)).toBe('Safari 18 on iOS');
  });

  it('says so when it can’t tell the browser', () => {
    expect(describeBrowser('SomethingElse/1.0')).toBe('Unknown browser');
  });
});

describe('currentPageContext', () => {
  it('sends the path without the query or the hash', () => {
    window.history.pushState({}, '', '/stories/turnul?code=secret#chapter-2');
    expect(currentPageContext().pagePath).toBe('/stories/turnul');
  });

  it('gives the window and the screen size', () => {
    expect(currentPageContext().screenSize).toMatch(/^\d+ × \d+ window, \d+ × \d+ screen$/);
  });
});
