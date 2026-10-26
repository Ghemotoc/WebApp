/** Tests for reading today's greeting (stories S1-E2-12 and S1-E2-13); Supabase is a fake here. */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { fetchMyGreeting } from './greeting';

/** A fake client whose my_greeting() answers what the test gives. */
function clientAnswering(answer: { data: unknown; error: unknown }): AppSupabaseClient {
  return { rpc: vi.fn().mockResolvedValue(answer) } as unknown as AppSupabaseClient;
}

describe('fetchMyGreeting', () => {
  it('reads the kind and the years', async () => {
    const client = clientAnswering({ data: { kind: 'anniversary', years: 2 }, error: null });
    await expect(fetchMyGreeting(client)).resolves.toEqual({ kind: 'anniversary', years: 2 });
  });

  it('treats an unknown kind as an ordinary day', async () => {
    const client = clientAnswering({ data: { kind: 'unknown', years: 0 }, error: null });
    await expect(fetchMyGreeting(client)).resolves.toEqual({ kind: null, years: 0 });
  });

  it('throws when the database can’t be reached', async () => {
    const client = clientAnswering({ data: null, error: { message: 'offline' } });
    await expect(fetchMyGreeting(client)).rejects.toThrow('offline');
  });
});
