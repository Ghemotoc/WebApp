/**
 * Tests for callRecorder (bundle LOGS-1, part c): each call is noted with its outcome and error
 * code, the answer reaches the app untouched, and calls that aren't ours are not noted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CallEntry } from '../api/callLog';

const sent: CallEntry[][] = [];

vi.mock('@/lib/supabase', () => ({ getSupabaseClient: () => Promise.resolve({}) }));
vi.mock('../api/callLog', () => ({
  sendCalls: (_client: unknown, entries: CallEntry[]) => {
    sent.push(entries);
    return Promise.resolve(entries.length);
  },
}));

const { flushCallsForTest, recordingFetch } = await import('./callRecorder');

const supabaseUrl = 'https://abc.supabase.co';
const pageOrigin = 'https://app.example.test';

/** A fetch that answers with the given status and body. */
function fakeFetch(status: number, body: unknown): typeof fetch {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      }),
    );
}

describe('callRecorder', () => {
  beforeEach(async () => {
    await flushCallsForTest();
    sent.length = 0;
  });

  it('notes a call that worked and passes the answer on untouched', async () => {
    const recording = recordingFetch(fakeFetch(200, { ok: true }), supabaseUrl, pageOrigin);
    const response = await recording(`${supabaseUrl}/rest/v1/rpc/my_discover_cards`, {
      method: 'POST',
    });
    expect(await response.json()).toEqual({ ok: true });
    await flushCallsForTest();
    expect(sent[0]?.[0]).toMatchObject({
      kind: 'rpc',
      name: 'my_discover_cards',
      method: 'POST',
      status: 200,
      error_code: null,
    });
  });

  it('notes a failed call with its code, never its message', async () => {
    const recording = recordingFetch(
      fakeFetch(403, { code: '42501', message: 'secret words someone typed' }),
      supabaseUrl,
      pageOrigin,
    );
    const response = await recording(`${supabaseUrl}/rest/v1/stories?title=eq.secret`);
    expect((await response.json()) as unknown).toMatchObject({ code: '42501' });
    await flushCallsForTest();
    expect(sent[0]?.[0]).toMatchObject({
      kind: 'table',
      name: 'stories',
      status: 403,
      error_code: '42501',
    });
    expect(JSON.stringify(sent)).not.toContain('secret');
  });

  it('notes a call with no answer as status 0, and the error still reaches the app', async () => {
    const failing: typeof fetch = () => Promise.reject(new TypeError('Failed to fetch'));
    const recording = recordingFetch(failing, supabaseUrl, pageOrigin);
    await expect(recording(`${supabaseUrl}/functions/v1/send-email`)).rejects.toThrow(
      'Failed to fetch',
    );
    await flushCallsForTest();
    expect(sent[0]?.[0]).toMatchObject({ kind: 'function', name: 'send-email', status: 0 });
  });

  it('leaves calls that aren’t ours alone', async () => {
    const recording = recordingFetch(fakeFetch(200, {}), supabaseUrl, pageOrigin);
    await recording('https://fonts.example.test/inter.woff2');
    expect(await flushCallsForTest()).toBe(0);
  });
});
