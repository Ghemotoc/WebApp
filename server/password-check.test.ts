/**
 * Tests for the leaked-password check's server side (story S1-E2-01; ADR 0003).
 * They prove it accepts only a 5-character prefix, passes the range list back unchanged and
 * answers 502 (never throws) when the range service is down.
 */
import { describe, expect, it, vi } from 'vitest';

import { handlePasswordCheck } from './password-check';

/** A POST to /api/password-check with a JSON body. */
function post(body: unknown): Request {
  return new Request('http://localhost/api/password-check', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('handlePasswordCheck', () => {
  it('asks the range service for the prefix and passes its list back', async () => {
    const fetchRange = vi.fn(async () => new Response('ABC:3\r\nDEF:0'));
    const response = await handlePasswordCheck(post({ prefix: 'abcde' }), fetchRange);
    expect(fetchRange).toHaveBeenCalledWith('ABCDE');
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('ABC:3\r\nDEF:0');
  });

  it('refuses anything but 5 hexadecimal characters, so it fetches nothing else', async () => {
    const fetchRange = vi.fn();
    for (const body of [{ prefix: 'ABCDEF' }, { prefix: '../x' }, { password: 'secret' }, null]) {
      expect((await handlePasswordCheck(post(body), fetchRange)).status).toBe(400);
    }
    expect(fetchRange).not.toHaveBeenCalled();
  });

  it('answers 502 when the range service is down, so the form can carry on', async () => {
    const response = await handlePasswordCheck(post({ prefix: 'ABCDE' }), async () => {
      throw new Error('offline');
    });
    expect(response.status).toBe(502);
  });
});
