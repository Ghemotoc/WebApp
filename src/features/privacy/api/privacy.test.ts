/**
 * Tests for the privacy settings' calls (story S1-E13-01). Supabase is a small fake here; the
 * database rules are in supabase/tests/database/209-privacy-settings.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  fetchOnlineHandles,
  fetchPrivacySettings,
  saveLibraryAudience,
  saveShowsOnlineStatus,
} from './privacy';

/** A fake client whose one rpc() answers as given. */
function fakeClient(answer: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn().mockResolvedValue(answer);
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('fetchPrivacySettings', () => {
  it('turns the database answer into the screen’s settings', async () => {
    const { client } = fakeClient({
      data: {
        profile_audience: 'people_i_follow',
        library_audience: 'only_me',
        shows_online_status: false,
        message_audience: 'people_i_follow',
        is_under_18: true,
      },
      error: null,
    });
    await expect(fetchPrivacySettings(client)).resolves.toEqual({
      profileAudience: 'people_i_follow',
      libraryAudience: 'only_me',
      showsOnlineStatus: false,
      messageAudience: 'people_i_follow',
      isUnder18: true,
    });
  });

  it('throws when the settings can’t be read, so the panel shows its message', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'Sign in first.' } });
    await expect(fetchPrivacySettings(client)).rejects.toThrow('Sign in first.');
  });
});

describe('the setters', () => {
  it('save the library choice under the name the database expects', async () => {
    const { client, rpc } = fakeClient({ data: null, error: null });
    await saveLibraryAudience(client, 'everyone');
    expect(rpc).toHaveBeenCalledWith('set_library_audience', { audience: 'everyone' });
  });

  it('throw when switching online status is refused, so the switch goes back', async () => {
    const { client } = fakeClient({ data: null, error: { message: 'refused' } });
    await expect(saveShowsOnlineStatus(client, true)).rejects.toThrow('refused');
  });
});

describe('fetchOnlineHandles', () => {
  it('answers the online usernames in lower case, so the screen can compare them', async () => {
    const { client, rpc } = fakeClient({ data: ['Teen_17'], error: null });
    const online = await fetchOnlineHandles(client, ['teen_17', 'teacher']);
    expect(online.has('teen_17')).toBe(true);
    expect(online.has('teacher')).toBe(false);
    expect(rpc).toHaveBeenCalledWith('who_is_online', { wanted_handles: ['teen_17', 'teacher'] });
  });
});
