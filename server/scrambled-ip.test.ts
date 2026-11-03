/**
 * Unit tests for scrambling IP addresses (bundle ADMIN-2, part e2b; decided 16 Oct 2026, Q48).
 * Who runs it: `npm test`. It checks the address never comes back as it was, the same address in
 * the same month scrambles the same way, the key changes every month, and nothing is kept without
 * an address or a secret.
 */
import { describe, expect, it } from 'vitest';

import { scrambleIp, scramblePeriod, visitorIp } from './scrambled-ip';

const november = new Date('2026-11-03T09:00:00Z');
const december = new Date('2026-12-01T00:00:00Z');

describe('scrambling an IP address', () => {
  it('names the month of the key in UTC', () => {
    expect(scramblePeriod(november)).toBe('2026-11');
    expect(scramblePeriod(new Date('2026-11-30T23:30:00-02:00'))).toBe('2026-12');
  });

  it('reads the address Cloudflare passes, and nothing locally', () => {
    const fromCloudflare = new Request('http://x', {
      headers: { 'CF-Connecting-IP': '203.0.113.7' },
    });
    expect(visitorIp(fromCloudflare)).toBe('203.0.113.7');
    expect(visitorIp(new Request('http://x'))).toBeNull();
  });

  it('scrambles one address the same way all month, never as the address itself', async () => {
    const first = await scrambleIp('203.0.113.7', 'test-secret', november);
    const again = await scrambleIp('203.0.113.7', 'test-secret', new Date('2026-11-20T12:00:00Z'));
    expect(first).toEqual(again);
    expect(first?.value).toMatch(/^[0-9a-f]{64}$/);
    expect(first?.value).not.toContain('203');
    expect(first?.period).toBe('2026-11');
  });

  it('changes the key every month', async () => {
    const inNovember = await scrambleIp('203.0.113.7', 'test-secret', november);
    const inDecember = await scrambleIp('203.0.113.7', 'test-secret', december);
    expect(inNovember?.value).not.toBe(inDecember?.value);
  });

  it('keeps nothing without an address or a secret', async () => {
    expect(await scrambleIp(null, 'test-secret', november)).toBeNull();
    expect(await scrambleIp('203.0.113.7', undefined, november)).toBeNull();
    expect(await scrambleIp('203.0.113.7', '', november)).toBeNull();
  });
});
