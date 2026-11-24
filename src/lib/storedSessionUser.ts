/**
 * storedSessionUser: the user ID of the session this browser has stored, read straight from
 * storage without waiting for the Supabase library (reader speed; S1-E4-01's criterion "readable
 * within 2 seconds on a mid-range phone on 4G"; Robert, 23 Nov 2026).
 *
 * Why: useSession() otherwise waits for Supabase's first Auth event. On a cold load that event
 * comes only after the library has downloaded and the early database reads have each taken their
 * turn with the session, so the chapter reader held a chapter that had already arrived for about a
 * third of a second before it could show it. A stored session is almost always the one Supabase
 * then reports; when Supabase says otherwise (the session ran out and couldn't be renewed), its
 * event replaces this first answer a moment later.
 * Privacy: reads only the ID, which stays in this browser and is never shown.
 * Who calls it: src/features/auth/hooks/useSession.ts.
 * What it reads: localStorage under AUTH_SESSION_STORAGE_KEY, the name src/lib/supabase.ts gives
 * the Supabase client's stored session.
 */
import { AUTH_SESSION_STORAGE_KEY } from './auth-session-key';

/** The parts of Supabase's stored session this file reads. */
type StoredSession = { user?: { id?: unknown }; refresh_token?: unknown };

/**
 * Reads the stored text, or null when storage is missing (no browser) or blocked (some private
 * windows).
 *
 * @returns the stored session as text, or null
 */
function storedSessionText(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * The stored session's user ID.
 *
 * @returns the ID, or null when nothing usable is stored
 * Errors: none; broken stored text reads as "nothing stored".
 */
export function storedSessionUserId(): string | null {
  // Step 1: the stored session, if there is one.
  const storedText = storedSessionText();
  if (storedText === null) return null;
  // Step 2: only a session Supabase can renew counts; anything else waits for Supabase's answer.
  try {
    const stored = JSON.parse(storedText) as StoredSession;
    const userId = stored.user?.id;
    if (typeof userId !== 'string' || userId === '') return null;
    if (typeof stored.refresh_token !== 'string' || stored.refresh_token === '') return null;
    return userId;
  } catch {
    return null;
  }
}
