/**
 * Tests for reading and changing one's own email address (story S1-E2-05, added 25 Oct 2026).
 * Supabase Auth is a small fake here; the real flow with both emailed codes is in
 * e2e/email-change.spec.ts.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { checkEmailChangeCode, fetchMyEmail, requestEmailChange } from './emailAddress';

/** A fake client whose Auth answers are given per test. */
function fakeClient(auth: Record<string, unknown>): AppSupabaseClient {
  return { auth } as unknown as AppSupabaseClient;
}

describe('fetchMyEmail', () => {
  it('reads the address and the one waiting for its codes', async () => {
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

  it('sends a clean new address and says the codes are sent', async () => {
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

describe('checkEmailChangeCode', () => {
  it('hands the digits and the address to Supabase and says the code is right', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ data: {}, error: null });
    await expect(
      checkEmailChangeCode(fakeClient({ verifyOtp }), ' New@Example.com ', '123 456'),
    ).resolves.toBe('confirmed');
    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'new@example.com',
      token: '123456',
      type: 'email_change',
    });
  });

  it('calls a code without six digits wrong without asking Supabase', async () => {
    const verifyOtp = vi.fn();
    await expect(
      checkEmailChangeCode(fakeClient({ verifyOtp }), 'me@example.com', '12345'),
    ).resolves.toBe('wrong_code');
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it('calls a code Supabase refuses wrong, so the box can say so', async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: {}, error: { status: 403, code: 'otp_expired' } });
    await expect(
      checkEmailChangeCode(fakeClient({ verifyOtp }), 'me@example.com', '123456'),
    ).resolves.toBe('wrong_code');
  });

  it('throws when Supabase can’t be reached, so the form shows the connection message', async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValue({ data: {}, error: { status: 0, code: 'fetch_failed' } });
    await expect(
      checkEmailChangeCode(fakeClient({ verifyOtp }), 'me@example.com', '123456'),
    ).rejects.toThrow('fetch_failed');
  });
});
