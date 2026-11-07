/**
 * Tests for the waiting list's calls on the screen side (bundle WAITLIST-1, story S1-E2-24):
 * reading one's own place, the staff list and letting people in. Supabase is a small fake here;
 * the database rules are in supabase/tests/database/310-waitlist.test.sql.
 *
 * Who runs it: `npm test`.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  admitFromWaitlist,
  admitWaitlistWave,
  fetchMyWaitlist,
  fetchStaffWaitlist,
  saveMyWaitlistInterest,
  WaitlistError,
} from './waitlist';

/**
 * A fake client whose rpc() answers once with the given data or error.
 *
 * @param answer - what the database sends back
 * @returns the client and the rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { code?: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

/** One page of the staff list, as admin_waitlist() answers it. */
const staffAnswer = {
  counts: { waiting: 2, write: 1, read: 0, both: 1, admitted: 4 },
  countries: [{ country: 'RO', waiting: 2 }],
  matching: 2,
  people: [
    {
      entry_id: 'e1',
      handle: 'ink_fox',
      display_name: null,
      interest: 'write',
      country: 'RO',
      joined_at: '2027-02-05T09:00:00Z',
      email_confirmed: true,
    },
  ],
};

describe('the holding page’s own place', () => {
  it('reads someone waiting, with their answer', async () => {
    const place = {
      on_list: true,
      waiting: true,
      interest: 'both',
      joined_at: '2027-02-05T09:00:00Z',
      admitted_at: null,
    };
    const { client } = fakeClient({ data: place });
    await expect(fetchMyWaitlist(client)).resolves.toEqual(place);
  });

  it('reads a member who never waited as not on the list', async () => {
    const { client } = fakeClient({ data: { on_list: false } });
    await expect(fetchMyWaitlist(client)).resolves.toEqual({ on_list: false });
  });

  it('fails loudly on an answer of an unknown shape', async () => {
    const { client } = fakeClient({ data: { on_list: true } });
    await expect(fetchMyWaitlist(client)).rejects.toEqual(new WaitlistError('unreachable'));
  });

  it('says the answer was refused when the person isn’t waiting any more', async () => {
    const { client, rpc } = fakeClient({ error: { code: '23514' } });
    await expect(saveMyWaitlistInterest(client, 'read')).rejects.toEqual(
      new WaitlistError('refused'),
    );
    expect(rpc).toHaveBeenCalledWith('set_my_waitlist_interest', { wanted: 'read' });
  });
});

describe('Staff › Waitlist', () => {
  it('asks for writers in one country and reads the page, never a user ID', async () => {
    const { client, rpc } = fakeClient({ data: staffAnswer });
    const answer = await fetchStaffWaitlist(client, {
      interest: 'write',
      country: 'RO',
      pageSize: 50,
      pageOffset: 0,
    });
    expect(rpc).toHaveBeenCalledWith('admin_waitlist', {
      wanted_interest: 'write',
      wanted_country: 'RO',
      page_size: 50,
      page_offset: 0,
    });
    expect(answer.people[0]).not.toHaveProperty('user_id');
  });

  it('tells a moderator they may not see the list', async () => {
    const { client } = fakeClient({ error: { code: '42501' } });
    await expect(
      fetchStaffWaitlist(client, { interest: null, country: null, pageSize: 50, pageOffset: 0 }),
    ).rejects.toEqual(new WaitlistError('not_allowed'));
  });

  it('lets the ticked people in and returns how many', async () => {
    const { client, rpc } = fakeClient({ data: 2 });
    await expect(admitFromWaitlist(client, ['e1', 'e2'])).resolves.toBe(2);
    expect(rpc).toHaveBeenCalledWith('admin_admit_from_waitlist', { entry_ids: ['e1', 'e2'] });
  });

  it('sends a wave of everyone in every country as empty filters', async () => {
    const { client, rpc } = fakeClient({ data: 10 });
    await expect(
      admitWaitlistWave(client, { interest: null, country: null, howMany: 10 }),
    ).resolves.toBe(10);
    expect(rpc).toHaveBeenCalledWith('admin_admit_waitlist_wave', {
      wanted_interest: '',
      wanted_country: '',
      how_many: 10,
    });
  });
});
