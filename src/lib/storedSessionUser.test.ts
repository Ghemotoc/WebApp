/**
 * The stored session's user ID, read before the Supabase library has loaded (reader speed).
 */
import { afterEach, describe, expect, it } from 'vitest';

import { AUTH_SESSION_STORAGE_KEY } from './auth-session-key';
import { storedSessionUserId } from './storedSessionUser';

/** Stores a session the way the Supabase client would. */
function storeSession(session: unknown): void {
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

describe('storedSessionUserId', () => {
  afterEach(() => window.localStorage.clear());

  it('gives the user ID of a stored session that can be renewed', () => {
    storeSession({ user: { id: 'user-1' }, refresh_token: 'refresh-1' });
    expect(storedSessionUserId()).toBe('user-1');
  });

  it('gives nothing when no session is stored', () => {
    expect(storedSessionUserId()).toBeNull();
  });

  it('gives nothing for a session without a refresh token, so Supabase decides', () => {
    storeSession({ user: { id: 'user-1' } });
    expect(storedSessionUserId()).toBeNull();
  });

  it('gives nothing for a session without a user ID', () => {
    storeSession({ user: {}, refresh_token: 'refresh-1' });
    expect(storedSessionUserId()).toBeNull();
  });

  it('reads broken stored text as nothing stored', () => {
    window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, '{not json');
    expect(storedSessionUserId()).toBeNull();
  });
});
