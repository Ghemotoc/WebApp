/**
 * Tests for the leaked-password check in the browser (story S1-E2-01; ADR 0003).
 * They prove only a 5-character prefix is sent, that a listed password is reported as leaked,
 * and that an unreachable check never blocks sign-up.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkPasswordLeak, rangeListContains } from './passwordLeak';

/** SHA-1 of "password": 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8. */
const passwordHashRest = '1E4C9B93F3F0682250B6CF8331B7EE68FD8';

afterEach(() => vi.unstubAllGlobals());

describe('checkPasswordLeak', () => {
  it('sends only the first 5 characters of the hash and finds a leaked password', async () => {
    const fetchMock = vi.fn(async () => new Response(`${passwordHashRest}:9545824\r\nAAAA:1`));
    vi.stubGlobal('fetch', fetchMock);
    expect(await checkPasswordLeak('password')).toBe('leaked');
    const [, requestOptions] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(requestOptions.body))).toEqual({ prefix: '5BAA6' });
  });

  it('reports a password that is not on the list', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('AAAA:1')),
    );
    expect(await checkPasswordLeak('password')).toBe('not_leaked');
  });

  it('answers unknown, never leaked, when the check can’t be reached', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('down', { status: 502 })),
    );
    expect(await checkPasswordLeak('password')).toBe('unknown');
  });
});

describe('rangeListContains', () => {
  it('ignores padding rows, whose count is 0', () => {
    expect(rangeListContains(`${passwordHashRest}:0`, passwordHashRest)).toBe(false);
  });
});
