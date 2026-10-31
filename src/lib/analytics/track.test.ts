/**
 * Unit tests for trackEvent (story S1-E15-01): off by default, nothing while the browser asks not
 * to be tracked, no cookies, and only the site's root and the catalogued properties are sent.
 * Who runs it: `npm test`. The provider is a fake fetch; the site and endpoint are made up.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  analyticsConfigFrom,
  browserAsksNotToTrack,
  trackEvent,
  type AnalyticsConfig,
} from './track';

const plausible: AnalyticsConfig = {
  provider: 'plausible',
  endpoint: 'https://analytics.example.test/api/event',
  site: 'site.example.test',
};

/** Records every request instead of sending it. */
function fakeFetch() {
  const sent: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      sent.push({ url, init });
      return new Response(null, { status: 202 });
    }),
  );
  return sent;
}

afterEach(() => vi.unstubAllGlobals());

describe('the analytics configuration', () => {
  it('is off unless a known provider, an endpoint and a site are all set', () => {
    expect(analyticsConfigFrom({}).provider).toBe('off');
    expect(analyticsConfigFrom({ VITE_ANALYTICS_PROVIDER: 'plausible' }).provider).toBe('off');
    expect(
      analyticsConfigFrom({
        VITE_ANALYTICS_PROVIDER: 'google',
        VITE_ANALYTICS_ENDPOINT: 'https://x.test',
        VITE_ANALYTICS_SITE: 'x',
      }).provider,
    ).toBe('off');
    expect(
      analyticsConfigFrom({
        VITE_ANALYTICS_PROVIDER: 'umami',
        VITE_ANALYTICS_ENDPOINT: 'https://x.test/api/send',
        VITE_ANALYTICS_SITE: 'abc',
      }).provider,
    ).toBe('umami');
  });

  it('treats Do Not Track and Global Privacy Control as a no', () => {
    expect(browserAsksNotToTrack({ doNotTrack: '1' })).toBe(true);
    expect(browserAsksNotToTrack({ globalPrivacyControl: true })).toBe(true);
    expect(browserAsksNotToTrack({ doNotTrack: null })).toBe(false);
  });
});

describe('trackEvent', () => {
  it('sends nothing while analytics is off', () => {
    const sent = fakeFetch();
    trackEvent('chapter_published', {}, { provider: 'off', endpoint: '', site: '' });
    expect(sent).toEqual([]);
  });

  it('sends one request without cookies, with the site root and the catalogued properties only', () => {
    const sent = fakeFetch();
    window.history.pushState({}, '', '/u/inkwolf');
    trackEvent('chapter_shared', { method: 'copy_link' }, plausible);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.init.credentials).toBe('omit');
    const body = JSON.parse(String(sent[0]?.init.body)) as Record<string, unknown>;
    expect(body).toEqual({
      name: 'chapter_shared',
      url: `${window.location.origin}/`,
      domain: 'site.example.test',
      props: { method: 'copy_link' },
    });
    // The page the person was on (here a username) never leaves.
    expect(String(sent[0]?.init.body)).not.toContain('inkwolf');
  });

  it('writes the Umami shape for Umami', () => {
    const sent = fakeFetch();
    trackEvent(
      'language_changed',
      { language: 'en' },
      { ...plausible, provider: 'umami', site: 'id-1' },
    );
    const body = JSON.parse(String(sent[0]?.init.body)) as { payload: Record<string, unknown> };
    expect(body.payload).toMatchObject({
      website: 'id-1',
      name: 'language_changed',
      url: '/',
      data: { language: 'en' },
    });
  });
});
