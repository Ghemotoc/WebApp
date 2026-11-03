/**
 * Unit tests for the picture check handler (story S1-E10-05).
 * Who runs it: `npm test`. The database and Storage are a fake fetch, so these tests check the
 * handler's own rules: the schema, the caller's token used for every call, a picture that isn't
 * pending left alone, and the signed verdict with the file's hash and the scrambled IP; a match's
 * file deleted at once (ADMIN-2e2b). The database's own checks are in pgTAP tests 164 and 250.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bearerToken, handlePictureCheck, sha256Hex, withStillPictureRule } from './picture-check';
import { checkWithStub } from './picture-check/stub';
import { hmacHex } from './signup-context';

const pictureId = '11111111-1111-4111-8111-111111111111';
const options = {
  supabaseUrl: 'http://db',
  anonKey: 'anon',
  secret: 'test-secret',
  checkPicture: checkWithStub,
};

/** A request as the upload screen sends it, through Cloudflare when an address is given. */
function post(body: unknown, token: string | null = 'person-token', address?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  if (address !== undefined) headers['CF-Connecting-IP'] = address;
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

  it("signs the file's hash and the scrambled IP, never the address itself (ADMIN-2e2b)", async () => {
    const calls = fakeBackend();
    await handlePictureCheck(
      post({ pictureId, originalName: 'cover.png' }, 'person-token', '203.0.113.7'),
      {
        ...options,
        ipSecret: 'ip-secret',
      },
    );
    const saved = JSON.parse(String(calls[2]?.init?.body)) as { payload: string };
    const payload = JSON.parse(saved.payload) as {
      fileSha256: string;
      uploaderIp: { value: string; period: string };
    };
    expect(payload.fileSha256).toBe(await sha256Hex(new Uint8Array([1])));
    expect(payload.uploaderIp.value).toMatch(/^[0-9a-f]{64}$/);
    expect(saved.payload).not.toContain('203.0.113.7');
  });

  it('keeps no IP address without the secret', async () => {
    const calls = fakeBackend();
    await handlePictureCheck(post({ pictureId }, 'person-token', '203.0.113.7'), options);
    const saved = JSON.parse(String(calls[2]?.init?.body)) as { payload: string };
    expect(JSON.parse(saved.payload)).toMatchObject({ uploaderIp: null });
  });

  it("deletes a matched picture's file at once, as the caller (ADMIN-2e2b)", async () => {
    const calls = fakeBackend();
    await handlePictureCheck(post({ pictureId, originalName: 'cover_match.png' }), options);
    const deletion = calls.find((call) => call.init?.method === 'DELETE');
    expect(deletion?.address).toBe('http://db/storage/v1/object/covers/story/x.png');
    expect((deletion?.init?.headers as Record<string, string>).Authorization).toBe(
      'Bearer person-token',
    );
  });

  it("never deletes a picture that didn't match", async () => {
    const calls = fakeBackend();
    await handlePictureCheck(post({ pictureId, originalName: 'cover_fail.png' }), options);
    expect(calls.some((call) => call.init?.method === 'DELETE')).toBe(false);
  });

  it('leaves a picture that is no longer pending as it is', async () => {
    const calls = fakeBackend('approved');
    const response = await handlePictureCheck(post({ pictureId }), options);
    expect(await response.json()).toEqual({ status: 'approved' });
    expect(calls).toHaveLength(1);
  });
});

describe('the still picture rule for signatures (S1-E8-08)', () => {
  /** The smallest animated WebP shape: RIFF, WEBP and an ANIM chunk. */
  const letters = (text: string) => [...text].map((letter) => letter.charCodeAt(0));
  const movingWebp = new Uint8Array([
    ...letters('RIFF'),
    0,
    0,
    0,
    0,
    ...letters('WEBP'),
    ...letters('ANIM'),
    2,
    0,
    0,
    0,
    0,
    0,
  ]);
  const passed = {
    outcome: 'passed',
    flags: {},
    isKnownAbuseMatch: false,
    provider: 'stub',
  } as const;

  it('a moving signature picture is held for a person, even when the services pass it', () => {
    const verdict = withStillPictureRule(passed, { bucket: 'signature-pictures' }, movingWebp);
    expect(verdict.outcome).toBe('flagged');
    expect(verdict.flags).toEqual({ animated: true });
  });

  it('a moving picture in another bucket, or an unanswered check, is left as it was', () => {
    expect(withStillPictureRule(passed, { bucket: 'covers' }, movingWebp)).toEqual(passed);
    const unavailable = { ...passed, outcome: 'unavailable' } as const;
    expect(withStillPictureRule(unavailable, { bucket: 'signature-pictures' }, movingWebp)).toEqual(
      unavailable,
    );
  });
});
