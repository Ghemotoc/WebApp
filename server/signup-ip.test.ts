/** Tests for the sign-up's scrambled IP token (bundle ADMIN-2, part f2). */
import { describe, expect, it } from 'vitest';

import { scrambleIp } from './scrambled-ip';
import { hmacHex } from './signup-context';
import { lastMonth, makeSignupIpToken } from './signup-ip';

/** A request as Cloudflare passes it, with the visitor's address. */
const requestFrom = (address?: string) =>
  new Request('https://example.com/api/signup-context', {
    headers: address === undefined ? {} : { 'CF-Connecting-IP': address },
  });

/** 2 December 2026, early: the month of the key and the one before it. */
const now = new Date(Date.UTC(2026, 11, 2, 8, 0, 0));
const secrets = { scrambleSecret: 'scramble', signingSecret: 'signing', now };

describe('the sign-up’s scrambled IP token', () => {
  it('finds last month across a year boundary', () => {
    expect(lastMonth(new Date(Date.UTC(2027, 0, 3))).toISOString()).toBe(
      '2026-12-15T00:00:00.000Z',
    );
  });

  it('carries the address scrambled under this month’s key and last month’s, signed, never the address', async () => {
    const token = await makeSignupIpToken(requestFrom('203.0.113.7'), secrets);
    expect(token).not.toBeNull();
    expect(token).not.toContain('203.0.113.7');
    const parts = (token ?? '').split('.');
    expect(parts).toHaveLength(7);
    const thisMonth = await scrambleIp('203.0.113.7', 'scramble', now);
    const previous = await scrambleIp('203.0.113.7', 'scramble', lastMonth(now));
    expect(parts.slice(0, 5)).toEqual([
      'ip1',
      thisMonth?.value,
      '2026-12',
      previous?.value,
      '2026-11',
    ]);
    expect(parts[5]).toBe(String(Math.floor(now.getTime() / 1000)));
    expect(parts[6]).toBe(await hmacHex(parts.slice(0, 6).join('.'), 'signing'));
  });

  it('makes nothing without an address or either secret', async () => {
    expect(await makeSignupIpToken(requestFrom(), secrets)).toBeNull();
    expect(
      await makeSignupIpToken(requestFrom('203.0.113.7'), { ...secrets, scrambleSecret: '' }),
    ).toBeNull();
    expect(
      await makeSignupIpToken(requestFrom('203.0.113.7'), { ...secrets, signingSecret: undefined }),
    ).toBeNull();
  });
});
