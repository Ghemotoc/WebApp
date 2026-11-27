/**
 * The chapter read sent before the Supabase library loads (the reader speed check, 27 Nov 2026).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_SESSION_STORAGE_KEY } from '@/lib/auth-session-key';

import { readChapterEarly } from './chapterEarlyRead';

// The library's client is only needed for pictures; the tests count when it is asked for.
const getSupabaseClient = vi.fn();
vi.mock('@/lib/supabase', () => ({
  getSupabaseClient: () => getSupabaseClient(),
  // The real page-language step without the reader-first hold: it hands the request on as it is.
  fetchWithPageLanguage: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init),
}));
// No signed country in these tests; the request goes on as it is.
vi.mock('@/lib/viewerCountry', () => ({
  startViewerCountry: () => undefined,
  fetchWithViewerCountry: (
    input: RequestInfo | URL,
    init: RequestInit | undefined,
    send: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  ) => send(input, init),
}));
const pictureViewsFromJson = vi.fn();
vi.mock('@/features/pictures/api/pictures', () => ({
  pictureViewsFromJson: (...args: unknown[]) => pictureViewsFromJson(...args),
}));

/** A minimal get_chapter() answer for a chapter the reader may see. */
function chapterAnswer(extra: Record<string, unknown> = {}) {
  return {
    story: {
      slug: 'statia-meteo',
      title: 'Stația meteo',
      language_code: 'ro',
      writer: { display_name: 'Ana', handle: 'ana' },
    },
    id: 'chapter-row',
    code: 'abcdefgh',
    title: 'Caietele bunicii',
    number: 1,
    total: 1,
    previous_code: null,
    next_code: null,
    published_at: '2026-11-20T10:00:00Z',
    edited_at: null,
    minutes_to_read: 4,
    is_owner: false,
    needs_sign_in: false,
    is_teaser: false,
    text_continues: false,
    body: 'Bunica notează vremea.',
    ...extra,
  };
}

/** Stores a session the way the library does, ending in the given number of seconds. */
function storeSession(accessToken: string, secondsLeft: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + secondsLeft;
  window.localStorage.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify({ access_token: accessToken, expires_at: expiresAt }),
  );
}

const fetchMock = vi.fn();

describe('readChapterEarly', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify(chapterAnswer()), { status: 200 }));
    getSupabaseClient.mockReset();
    pictureViewsFromJson.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('a visitor asks with the anon key and gets the chapter, without loading the library', async () => {
    const chapter = await readChapterEarly('statia-meteo', 'abcdefgh');
    expect(chapter?.title).toBe('Caietele bunicii');
    expect(getSupabaseClient).not.toHaveBeenCalled();
    const [address, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(address).toBe('https://db.example/rest/v1/rpc/get_chapter');
    const headers = new Headers(init.headers);
    expect(headers.get('apikey')).toBe('anon-key');
    expect(headers.get('Authorization')).toBe('Bearer anon-key');
    expect(JSON.parse(String(init.body))).toEqual({
      story_slug: 'statia-meteo',
      chapter_code: 'abcdefgh',
    });
  });

  it('a signed-in reader asks with their own token', async () => {
    storeSession('reader-token', 3600);
    await readChapterEarly('statia-meteo', 'abcdefgh');
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer reader-token');
  });

  it('a session about to end is left to the library, which refreshes it first', async () => {
    storeSession('reader-token', 30);
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('an unreadable stored session is left to the library', async () => {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, 'not json');
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a chapter the reader may not see answers null, not "ask again"', async () => {
    fetchMock.mockResolvedValueOnce(new Response('null', { status: 200 }));
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeNull();
  });

  it('a refused request or a network failure steps aside for the library', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 401 }));
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeUndefined();
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeUndefined();
  });

  it('without the build settings it doesn’t ask at all', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(readChapterEarly('statia-meteo', 'abcdefgh')).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a chapter with pictures waits for the library to sign their addresses', async () => {
    const pictures = { 'picture-1': { state: 'clear', path: 'a.png' } };
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(chapterAnswer({ pictures })), { status: 200 }),
    );
    getSupabaseClient.mockResolvedValue({ client: true });
    pictureViewsFromJson.mockResolvedValue({ 'picture-1': { url: 'signed' } });
    const chapter = await readChapterEarly('statia-meteo', 'abcdefgh');
    expect(pictureViewsFromJson).toHaveBeenCalledWith({ client: true }, pictures);
    expect(chapter?.pictures).toEqual({ 'picture-1': { url: 'signed' } });
  });
});
