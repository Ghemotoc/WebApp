/** Tests for the sign-up context: the country from the connection and its token (story S1-E2-10). */
import { describe, expect, it } from 'vitest';

import {
  countryOfConnection,
  handleSignupContext,
  hmacHex,
  makeSignupToken,
} from './signup-context';

/** A request with Cloudflare's country header. */
const requestFrom = (country?: string) =>
  new Request('https://example.com/api/signup-context', {
    headers: country === undefined ? {} : { 'CF-IPCountry': country },
  });

describe('the country from the connection', () => {
  it('reads Cloudflare’s country, preferring request.cf.country', () => {
    expect(countryOfConnection(requestFrom('ro'))).toBe('RO');
    expect(countryOfConnection(requestFrom('GB'), 'IE')).toBe('IE');
  });

  it('treats unknown (XX), Tor (T1) and missing as no country', () => {
    expect(countryOfConnection(requestFrom('XX'))).toBeNull();
    expect(countryOfConnection(requestFrom('T1'))).toBeNull();
    expect(countryOfConnection(requestFrom())).toBeNull();
    expect(countryOfConnection(requestFrom('ROM'))).toBeNull();
  });
});

describe('the token', () => {
  it('signs the version, the country and the time with HMAC-SHA256, like Postgres', async () => {
    // The RFC 4231 test case 2 key and data, so the hex matches any HMAC-SHA256.
    expect(await hmacHex('what do ya want for nothing?', 'Jefe')).toBe(
      '5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843',
    );
    const token = await makeSignupToken('RO', 1_790_000_000, 'secret');
    expect(token).toBe(`v1.RO.1790000000.${await hmacHex('v1.RO.1790000000', 'secret')}`);
  });

  it('answers the country and a token, and only the country code: never the IP address', async () => {
    const response = await handleSignupContext(requestFrom('RO'), {
      secret: 'secret',
      now: new Date('2026-10-17T12:00:00Z'),
    });
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const body = (await response.json()) as Record<string, unknown>;
    // The IP token (ADMIN-2f2) carries only scrambled values; without one it is null.
    expect(Object.keys(body).sort()).toEqual(['country', 'ipToken', 'token']);
    expect(body.ipToken).toBeNull();
    expect(body.country).toBe('RO');
    expect(String(body.token)).toMatch(/^v1\.RO\.\d+\.[0-9a-f]{64}$/);
  });

  it('makes no token without a country or without the secret', async () => {
    const now = new Date();
    const unknown = (await (
      await handleSignupContext(requestFrom('XX'), { secret: 's', now })
    ).json()) as Record<string, unknown>;
    expect(unknown).toEqual({ country: null, token: null, ipToken: null });
    const noSecret = (await (
      await handleSignupContext(requestFrom('RO'), { now })
    ).json()) as Record<string, unknown>;
    expect(noSecret).toEqual({ country: 'RO', token: null, ipToken: null });
  });
});
