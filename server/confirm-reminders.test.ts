/**
 * Unit tests for the one "confirm your email" reminder worker (CONFIRM-1).
 * They cover the worker key, asking Supabase Auth to send the sign-up email again, carrying on past
 * a refusal, and marking only what left. Supabase is faked with a stubbed fetch; nothing leaves the
 * machine.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  askAuthToResend,
  handleConfirmReminders,
  type ClaimedConfirmReminder,
  type ConfirmReminderOptions,
} from './confirm-reminders';

const options: ConfirmReminderOptions = {
  supabaseUrl: 'https://db.test',
  anonKey: 'anon',
  workerKey: 'worker-key',
};

/** The database's call, with the given key. */
function workerCall(key: string): Request {
  return new Request('https://site.test/api/confirm-reminders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
  });
}

/** Two due accounts; Auth refuses the second. */
const claimed: ClaimedConfirmReminder[] = [
  { id: 'account-1', email: 'first@example.test' },
  { id: 'account-2', email: 'refused@example.test' },
];

/**
 * Fakes Supabase: the claim answers `claimed`, Auth refuses refused@, the mark answers 1.
 *
 * @returns every call made, with its address and body
 */
function fakeSupabase(claimAnswer: Response = Response.json(claimed)) {
  const calls: { url: string; body: string; apikey: string | null }[] = [];
  vi.stubGlobal('fetch', (url: string, init: RequestInit) => {
    const body = String(init.body);
    calls.push({ url, body, apikey: new Headers(init.headers).get('apikey') });
    if (url.endsWith('confirm_reminder_claim')) return Promise.resolve(claimAnswer);
    if (url.endsWith('/auth/v1/resend') && body.includes('refused@')) {
      return Promise.resolve(new Response('{}', { status: 429 }));
    }
    return Promise.resolve(Response.json(1));
  });
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('askAuthToResend', () => {
  it('asks Auth for the sign-up email again with the public key only', async () => {
    const calls = fakeSupabase();

    expect(await askAuthToResend('first@example.test', options)).toBe(true);
    expect(calls[0]?.url).toBe('https://db.test/auth/v1/resend');
    expect(JSON.parse(calls[0]?.body ?? '{}')).toEqual({
      type: 'signup',
      email: 'first@example.test',
    });
    expect(calls[0]?.apikey).toBe('anon');
  });

  it('says no when Auth cannot be reached', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('down')));

    expect(await askAuthToResend('first@example.test', options)).toBe(false);
  });
});

describe('handleConfirmReminders', () => {
  it('answers 503 while the worker key is not set', async () => {
    const response = await handleConfirmReminders(workerCall('anything'), {
      ...options,
      workerKey: undefined,
    });

    expect(response.status).toBe(503);
  });

  it('refuses a call with the wrong key', async () => {
    const response = await handleConfirmReminders(workerCall('wrong'), options);

    expect(response.status).toBe(401);
  });

  it('asks Auth for each claimed account and marks only the reminders that left', async () => {
    const calls = fakeSupabase();

    const response = await handleConfirmReminders(workerCall('worker-key'), options);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 1, failed: 1 });
    const mark = calls.find((call) => call.url.endsWith('confirm_reminder_mark_sent'));
    expect(JSON.parse(mark?.body ?? '{}')).toEqual({
      worker_key: 'worker-key',
      profile_ids: ['account-1'],
    });
  });

  it('marks nothing when nothing is due', async () => {
    const calls = fakeSupabase(Response.json([]));

    const response = await handleConfirmReminders(workerCall('worker-key'), options);

    expect(await response.json()).toEqual({ sent: 0, failed: 0 });
    expect(calls.some((call) => call.url.endsWith('confirm_reminder_mark_sent'))).toBe(false);
  });

  it('answers 503 when the database refuses the claim', async () => {
    fakeSupabase(new Response('{}', { status: 500 }));

    const response = await handleConfirmReminders(workerCall('worker-key'), options);

    expect(response.status).toBe(503);
  });
});
