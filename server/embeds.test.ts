/**
 * Unit tests for the music and video handler (story S1-E3-10).
 * Who runs it: `npm test`. The database is a fake fetch, so these tests check the handler's own
 * rules: the schema, an allowed link only, the oEmbed answer, the caller's own token and the
 * database's refusals read as plain reasons. The database's checks are in pgTAP test 186.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { failureFromRefusal, handleEmbed } from './embeds';
import { lookUpWithStub } from './embeds/oembed';

const chapterId = '11111111-1111-4111-8111-111111111111';
const embedId = '22222222-2222-4222-8222-222222222222';
const options = { supabaseUrl: 'http://db', anonKey: 'anon', lookUpOembed: lookUpWithStub };

/** A request as the dialog sends it. */
function post(body: unknown, token: string | null = 'person-token'): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token !== null) headers.Authorization = `Bearer ${token}`;
  return new Request('http://localhost/api/embed', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

/** A fake register_chapter_embed() that answers with the given status and body. */
function fakeDatabase(status: number, body: unknown) {
  const calls: { address: string; init: RequestInit | undefined }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (address: string, init?: RequestInit) => {
      calls.push({ address, init });
      return Response.json(body, { status });
    }),
  );
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

describe('the music and video handler', () => {
  it('refuses a bad request, a signed-out caller and a link from another site', async () => {
    fakeDatabase(200, embedId);
    expect((await handleEmbed(post({ chapterId: 'x', link: 'y' }), options)).status).toBe(400);
    const link = 'https://youtu.be/dQw4w9WgXcQ';
    expect((await handleEmbed(post({ chapterId, link }, null), options)).status).toBe(401);
    const other = await handleEmbed(post({ chapterId, link: 'https://example.org/v' }), options);
    expect(other.status).toBe(422);
    expect(await other.json()).toEqual({ error: 'not_allowed' });
  });

  it('says a missing or unreachable video plainly, before saving anything', async () => {
    const calls = fakeDatabase(200, embedId);
    const missing = await handleEmbed(
      post({ chapterId, link: 'https://youtu.be/notfound123' }),
      options,
    );
    expect(missing.status).toBe(404);
    const down = await handleEmbed(
      post({ chapterId, link: 'https://youtu.be/down1234567' }),
      options,
    );
    expect(down.status).toBe(503);
    expect(calls).toHaveLength(0);
  });

  it('saves the card as the caller and answers with the title from oEmbed', async () => {
    const calls = fakeDatabase(200, embedId);
    const response = await handleEmbed(
      post({ chapterId, link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=x' }),
      options,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      embedId,
      service: 'youtube',
      mediaPath: 'dQw4w9WgXcQ',
      title: 'Test YouTube title',
      authorName: 'Test channel',
    });
    const headers = new Headers(calls[0]?.init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer person-token');
    expect(JSON.parse(String(calls[0]?.init?.body))).toMatchObject({
      target_chapter_id: chapterId,
      embed_service: 'youtube',
      embed_source_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
  });

  it('reads the database refusals as the dialog reasons', async () => {
    fakeDatabase(400, { code: '0A000' });
    const link = 'https://youtu.be/dQw4w9WgXcQ';
    expect((await handleEmbed(post({ chapterId, link }), options)).status).toBe(403);
    expect(failureFromRefusal({ code: '42501' })).toEqual({ failure: 'account' });
    expect(failureFromRefusal({ code: '23514' })).toEqual({ failure: 'chapter_not_found' });
    expect(failureFromRefusal({ code: '54000', hint: 'wait_minutes:12' })).toEqual({
      failure: 'too_many',
      waitMinutes: 12,
    });
    expect(failureFromRefusal({ code: 'XX000' })).toEqual({ failure: 'unreachable' });
  });
});
