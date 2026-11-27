/**
 * Asks get_chapter() straight away, without waiting for the Supabase library (the reader speed
 * check, 27 Nov 2026; S1-E4-01's "readable within 2 seconds on a mid-range phone on 4G").
 *
 * Why: on a cold load the Supabase library (about 100 KB of script) has to download, run and
 * read the session before its first request leaves. On a slow phone that is 300 to 500 ms in
 * which the chapter could already be on its way. get_chapter() is one plain HTTP call, so this
 * file sends it itself, with the same headers the library would send, and lets the library
 * load alongside.
 * When it steps aside: whenever it can't be sure it sends what the library would (no settings, a
 * stored session that is unreadable or close to expiring, which the library would refresh first)
 * it answers undefined, and chapterPrefetch.ts uses the library as before. A failed or refused
 * request also answers undefined, so the library's own error path decides what the reader sees.
 * Who calls it: api/chapterPrefetch.ts (prefetchChapter).
 * What it calls: PostgREST's /rest/v1/rpc/get_chapter through fetchWithViewerCountry
 * (src/lib/viewerCountry.ts), fetchWithVisitorAdult (src/lib/visitorAdult.ts) and
 * fetchWithPageLanguage (src/lib/supabase.ts), the same chain the shared client uses; then
 * chapterFromAnswer() in api/chapter.ts.
 */
import { AUTH_SESSION_STORAGE_KEY } from '@/lib/auth-session-key';
import { fetchWithPageLanguage, getSupabaseClient } from '@/lib/supabase';
import { fetchWithViewerCountry, startViewerCountry } from '@/lib/viewerCountry';
import { fetchWithVisitorAdult } from '@/lib/visitorAdult';

import { chapterFromAnswer, type ReaderChapter } from './chapter';

/**
 * A stored session this close to its end (in seconds) is left to the library, which refreshes
 * it before its first request; sending it as it is could reach the database already expired.
 */
const SESSION_MARGIN_SECONDS = 120;

/** What the early read decided about the stored session. */
type StoredToken = { kind: 'signed-in'; accessToken: string } | { kind: 'signed-out' } | null;

/**
 * Reads the signed-in reader's access token from where the library keeps the session.
 *
 * @returns the token; signed-out when there is no session; null when the session can't be used
 *   as it is (unreadable, or expiring soon), so the library must take over
 */
function storedToken(): StoredToken {
  // Step 1: read the stored session; the browser may refuse storage (a private window).
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (stored === null) return { kind: 'signed-out' };
  // Step 2: the library stores the session as JSON with the token and its end in seconds.
  try {
    const session = JSON.parse(stored) as { access_token?: unknown; expires_at?: unknown };
    if (typeof session.access_token !== 'string' || typeof session.expires_at !== 'number') {
      return null;
    }
    // Step 3: a session near its end goes through the library, which refreshes it first.
    const secondsLeft = session.expires_at - Date.now() / 1000;
    if (secondsLeft < SESSION_MARGIN_SECONDS) return null;
    return { kind: 'signed-in', accessToken: session.access_token };
  } catch {
    return null;
  }
}

/**
 * Sends get_chapter() itself and turns the answer into the reader's shape.
 *
 * @param storySlug - the story's address
 * @param chapterCode - the chapter's code
 * @returns the chapter (null when the reader may not see it), or undefined when the early read
 *   stepped aside or failed and the library should ask instead
 * Errors: none; every failure answers undefined.
 */
export async function readChapterEarly(
  storySlug: string,
  chapterCode: string,
): Promise<ReaderChapter | null | undefined> {
  // Step 1: the build's two public values; without them there is nothing to ask.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
  if (supabaseUrl === '' || anonKey === '') return undefined;
  // Step 2: the reader's token, or the anon key for a visitor, as the library would send.
  const token = storedToken();
  if (token === null) return undefined;
  const bearer = token.kind === 'signed-in' ? token.accessToken : anonKey;
  // Step 3: the connection's country travels with it, as with every request (COUNTRY-1).
  startViewerCountry();
  try {
    const response = await fetchWithViewerCountry(
      `${supabaseUrl}/rest/v1/rpc/get_chapter`,
      {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${bearer}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ story_slug: storySlug, chapter_code: chapterCode }),
      },
      (input, init) => fetchWithVisitorAdult(input, init, fetchWithPageLanguage),
    );
    // Step 4: a refused request goes again through the library, whose error the reader sees.
    if (!response.ok) return undefined;
    // Step 5: the same shaping as the library's path; pictures alone wait for the library.
    return await chapterFromAnswer(await response.json(), getSupabaseClient);
  } catch {
    return undefined;
  }
}
