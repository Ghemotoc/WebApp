/**
 * Tests for sending the connection's signed country with every request (bundle COUNTRY-1).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchWithViewerCountry, resetViewerCountryForTests } from './viewerCountry';

/** A fetch that records the headers it was given. */
function recordingFetch() {
  const seen: Headers[] = [];
  const send = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    seen.push(new Headers(init?.headers));
    return Promise.resolve(new Response('{}'));
  });
  return { send, seen };
}

describe('the viewer country header', () => {
  afterEach(() => resetViewerCountryForTests());

  it('adds the signed country to a request when there is a token', async () => {
    resetViewerCountryForTests('v1.MD.1.abc');
    const { send, seen } = recordingFetch();
    await fetchWithViewerCountry('https://example.test/rest', { headers: { apikey: 'k' } }, send);
    expect(seen[0]?.get('X-Viewer-Country')).toBe('v1.MD.1.abc');
    expect(seen[0]?.get('apikey')).toBe('k');
  });

  it('sends the request unchanged when the country is not known', async () => {
    resetViewerCountryForTests(null);
    const { send, seen } = recordingFetch();
    await fetchWithViewerCountry('https://example.test/rest', undefined, send);
    expect(seen[0]?.has('X-Viewer-Country')).toBe(false);
  });
});
