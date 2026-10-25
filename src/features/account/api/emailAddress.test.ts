/**
 * Tests for reading and changing one's own email address (story S1-E2-05, added 25 Oct 2026).
 * Supabase Auth is a small fake here; the real flow with both emailed links is in
 * e2e/email-change.spec.ts.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { confirmEmailChange, fetchMyEmail, requestEmailChange } from './emailAddress';

/** A fake client whose Auth answers are given per test. */
function fakeClient(auth: Record<string, unknown>): AppSupabaseClient {
  return { auth } as unknown as AppSupabaseClient;
}

describe('fetchMyEmail', () => {
  it('reads the address and the one waiting for its links', async () => {
    const client = fakeClient({
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email: 'old@example.com', new_email: 'new@example.com' } },
        error: null,
      }),
    });
    await expect(fetchMyEmail(client)).resolves.toEqual({
      email: 'old@example.com',
      pendingEmail: 'new@example.com',
    });
  });

  it('throws when nobody is signed in', async () => {
    const client = fakeClient({
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    });
    await expect(fetchMyEmail(client)).rejects.toThrow('Could not read the account.');
  });
});

describe('requestEmailChange', () => {
  it('refuses the same address, whatever its case, without asking Supabase', async () => {
    const updateUser = vi.fn();
    const outcome = await requestEmailChange(
      fakeClient({ updateUser }),
      'me@example.com',
      ' Me@Example.com ',
    );
    expect(outcome).toBe('same_address');
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('sends a clean new address and says the links are sent', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: {}, error: null });
    const outcome = await requestEmailChange(
      fakeClient({ updateUser }),
      'me@example.com',
      ' New@Example.com',
    );
    expect(outcome).toBe('sent');
    expect(updateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
  });

  it.each([
    ['email_exists', 'address_in_use'],
    ['email_address_invalid', 'invalid_address'],
    ['over_email_send_rate_limit', 'too_many_attempts'],
  ])('turns Supabase’s %s into %s', async (code, expected) => {
    const updateUser = vi.fn().mockResolvedValue({ data: {}, error: { code } });
    await expect(
      requestEmailChange(fakeClient({ updateUser }), 'me@example.com', 'new@example.com'),
    ).resolves.toBe(expected);
  });

  it('throws for any other failure, so the screen shows the connection message', async () => {
    const updateUser = vi.fn().mockResolvedValue({ data: {}, error: { code: 'unexpected' } });
    await expect(
      requestEmailChange(fakeClient({ updateUser }), 'me@example.com', 'new@example.com'),
    ).rejects.toThrow('unexpected');
  });
});

describe('confirmEmailChange', () => {
  /** A fake client whose verifyOtp answers once. */
  const answering = (answer: unknown) =>
    fakeClient({ verifyOtp: vi.fn().mockResolvedValue(answer) });

  it('after the first link, says to open the other one', async () => {
    await expect(
      confirmEmailChange(answering({ data: { user: null }, error: null }), 'token'),
    ).resolves.toBe('open_the_other_link');
  });

  it('after the second link, says the address is changed', async () => {
    const changed = { data: { user: { email: 'new@example.com', new_email: '' } }, error: null };
    await expect(confirmEmailChange(answering(changed), 'token')).resolves.toBe('changed');
  });

  it('says a used or expired link no longer works', async () => {
    const expired = { data: { user: null }, error: { code: 'otp_expired' } };
    await expect(confirmEmailChange(answering(expired), 'token')).resolves.toBe('link_not_working');
  });
});
