/**
 * Unit tests for reading and adding staff notes (bundle LOGS-1, part a).
 *
 * Who runs it: `npm test`.
 * What it proves: a page of rows becomes notes with the total count; no rows means a count of 0;
 * the database's refusals become reasons the page can explain.
 */
import { describe, expect, it } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { addAccountNote, AccountNotesError, fetchAccountNotes } from './accountNotes';

/**
 * A client whose rpc() answers with what the test gives.
 *
 * @param answer - the data and error rpc() resolves with
 * @returns a stand-in for the shared client
 */
function clientAnswering(answer: { data: unknown; error: { code: string } | null }) {
  return { rpc: () => Promise.resolve(answer) } as unknown as AppSupabaseClient;
}

const row = {
  id: 'note-1',
  body: 'Asked about a class invite.',
  author_handle: 'support',
  author_user_id_short: '00000000',
  created_at: '2026-11-06T07:10:00Z',
  total_count: 23,
};

describe('fetchAccountNotes', () => {
  it('turns the rows into notes and keeps the total count', async () => {
    const page = await fetchAccountNotes(clientAnswering({ data: [row], error: null }), 'id', 1);
    expect(page.totalCount).toBe(23);
    expect(page.notes).toEqual([
      {
        id: 'note-1',
        body: 'Asked about a class invite.',
        authorHandle: 'support',
        authorUserIdShort: '00000000',
        createdAt: '2026-11-06T07:10:00Z',
      },
    ]);
  });

  it('says there are no notes when the page is empty', async () => {
    const page = await fetchAccountNotes(clientAnswering({ data: [], error: null }), 'id', 1);
    expect(page).toEqual({ notes: [], totalCount: 0 });
  });

  it('says a member may not read notes', async () => {
    await expect(
      fetchAccountNotes(clientAnswering({ data: null, error: { code: '42501' } }), 'id', 1),
    ).rejects.toMatchObject({ failure: 'not_allowed' });
  });
});

describe('addAccountNote', () => {
  it('returns the new note’s ID', async () => {
    const client = clientAnswering({ data: 'note-2', error: null });
    expect(await addAccountNote(client, 'id', 'A note')).toBe('note-2');
  });

  it('explains an empty or long note, a missing account and a dropped connection', async () => {
    const reasons: Record<string, string> = {
      '23514': 'empty_or_long',
      P0002: 'no_such_account',
      '08006': 'unreachable',
    };
    for (const [code, failure] of Object.entries(reasons)) {
      const client = clientAnswering({ data: null, error: { code } });
      const refusal = await addAccountNote(client, 'id', 'A note').catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(AccountNotesError);
      expect((refusal as AccountNotesError).failure).toBe(failure);
    }
  });
});
