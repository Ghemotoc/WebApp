/**
 * Unit tests for the picture check handler (story S1-E10-05).
 * Who runs it: `npm test`. The database and Storage are a fake fetch, so these tests check the
 * handler's own rules: the schema, the caller's token used for every call, a picture that isn't
 * pending left alone, and the signed verdict. The database's own checks are in pgTAP test 164.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bearerToken, handlePictureCheck } from './picture-check';
import { checkWithStub } from './picture-check/stub';
import { hmacHex } from './signup-context';

const pictureId = '11111111-1111-4111-8111-111111111111';
const options = {
  supabaseUrl: 'http://db',
  anonKey: 'anon',
  secret: 'test-secret',
  checkPicture: checkWithStub,
};

/** A request as the upload screen sends it. */
function post(body: unknown, token: string | null = 'person-token'): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/api/picture-check', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** A fake database and Storage: the row, the file and record_picture_check(). */
function fakeBackend(status = 'pending') {
  const calls: { address: string; init: RequestInit | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (address: string, init?: RequestInit) => {
      calls.push({ address, init });
      if (address.includes('/rest/v1/picture_checks'))
        return Response.json([{ bucket: 'covers', path: 'story/x.png', status }]);
      if (address.includes('/storage/v1/'))
        return new Response(new Uint8Array([1]), { headers: { 'Content-Type': 'image/png' } });
      return Response.json('held');
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('the picture check handler', () => {
  it('reads the bearer token', () => {
    expect(bearerToken(post({}, 'abc'))).toBe('abc');
    expect(bearerToken(post({}, null))).toBeNull();
  });

  it('refuses a bad request, a signed-out caller and a missing secret', async () => {
    expect((await handlePictureCheck(post({ pictureId: 'nope' }), options)).status).toBe(400);
    expect((await handlePictureCheck(post({ pictureId }, null), options)).status).toBe(401);
    expect((await handlePictureCheck(post({ pictureId }), { ...options, secret: '' })).status).toBe(
      503,
    );
  });

  it('checks a pending picture as the caller and saves the signed verdict', async () => {
    const calls = fakeBackend();
    const response = await handlePictureCheck(
      post({ pictureId, originalName: 'cover_fail.png' }),
      options,
    );
    expect(await response.json()).toEqual({ status: 'held' });
    // Every call carries the caller's own token, never a service key.
    for (const call of calls)
      expect((call.init?.headers as Record<string, string>).Authorization).toBe(
        'Bearer person-token',
      );
    const saved = JSON.parse(String(calls[2]?.init?.body)) as {
      payload: string;
      signature: string;
    };
    expect(JSON.parse(saved.payload)).toMatchObject({
      pictureId,
      outcome: 'flagged',
      provider: 'stub',
    });
    expect(saved.signature).toBe(await hmacHex(saved.payload, 'test-secret'));
  });

  it('leaves a picture that is no longer pending as it is', async () => {
    const calls = fakeBackend('approved');
    const response = await handlePictureCheck(post({ pictureId }), options);
    expect(await response.json()).toEqual({ status: 'approved' });
    expect(calls).toHaveLength(1);
  });
});
