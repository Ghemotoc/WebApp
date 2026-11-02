/**
 * Tests for a teacher's class tools on the screen side (bundle CLASSES, part b; story S1-E8-11):
 * starting a class space, the lock call, the waiting list and the lock date helpers. Supabase is
 * a small fake here; the database rules are in supabase/tests/database/233-class-tools.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import {
  classToolErrorFrom,
  createClassSpace,
  fetchClassWaitingMembers,
  lockDateText,
  lockDayOf,
  lockTimeOf,
  setClassLock,
} from './classTools';

/**
 * A fake client whose rpc() answers once with the given data or error.
 *
 * @param answer - what the database sends back
 * @returns the client and the rpc spy
 */
function fakeClient(answer: { data?: unknown; error?: { code?: string; hint?: string } }) {
  const rpc = vi.fn().mockResolvedValue({ data: answer.data ?? null, error: answer.error ?? null });
  return { client: { rpc } as unknown as AppSupabaseClient, rpc };
}

describe('classToolErrorFrom', () => {
  it('reads a date too far ahead from its hint', () => {
    expect(classToolErrorFrom({ hint: 'lock:date' }).failure).toBe('lock_date');
  });

  it('treats an open space like a missing class, so nothing is given away', () => {
    expect(classToolErrorFrom({ hint: 'space:not_class' }).failure).toBe('missing');
  });

  it('falls back to "couldn’t reach the server" for anything else', () => {
    expect(classToolErrorFrom({ hint: null }).failure).toBe('unreachable');
  });
});

describe('createClassSpace', () => {
  it('sends only the name, words and banner, and returns the new address', async () => {
    const { client, rpc } = fakeClient({ data: { slug: 'class-9b' } });
    const slug = await createClassSpace(client, {
      name: 'Class 9B',
      description: 'Our class',
      rules: '',
      posting: 'anyone',
      joining: 'open',
      readers: 'everybody',
      banner: 'plum',
    });
    expect(slug).toBe('class-9b');
    expect(rpc).toHaveBeenCalledWith('create_class_space', {
      name: 'Class 9B',
      description: 'Our class',
      rules: '',
      banner: 'plum',
    });
  });
});

describe('setClassLock', () => {
  it('leaves the time out to unlock the class', async () => {
    const { client, rpc } = fakeClient({ data: { locks_at: null, is_locked: false } });
    const lock = await setClassLock(client, { slug: 'class-9b', locksAt: null });
    expect(rpc).toHaveBeenCalledWith('set_class_lock', { slug: 'class-9b' });
    expect(lock).toEqual({ locksAt: null, isLocked: false });
  });

  it('sends a new lock time and reads the answer', async () => {
    const at = '2027-07-01T00:00:00+03:00';
    const { client, rpc } = fakeClient({ data: { locks_at: at, is_locked: false } });
    await setClassLock(client, { slug: 'class-9b', locksAt: at });
    expect(rpc).toHaveBeenCalledWith('set_class_lock', { slug: 'class-9b', new_locks_at: at });
  });

  it('throws the failure when someone without the power tries', async () => {
    const { client } = fakeClient({ error: { hint: 'space:not_allowed' } });
    await expect(setClassLock(client, { slug: 'x', locksAt: null })).rejects.toMatchObject({
      failure: 'not_allowed',
    });
  });
});

describe('fetchClassWaitingMembers', () => {
  it('reads each waiting member with a reason, and an unknown reason as "account"', async () => {
    const { client } = fakeClient({
      data: [
        { handle: 'radu.c', display_name: 'Radu', reason: 'age_check' },
        { handle: 'ioana.v', display_name: 'Ioana', reason: 'parental_consent' },
        { handle: 'teo_ink', display_name: 'teo_ink', reason: 'something_new' },
      ],
    });
    const waiting = await fetchClassWaitingMembers(client, 'class-9b');
    expect(waiting.map((member) => member.reason)).toEqual([
      'age_check',
      'parental_consent',
      'account',
    ]);
    expect(waiting[0]).toEqual({ handle: 'radu.c', displayName: 'Radu', reason: 'age_check' });
  });
});

describe('the lock date helpers', () => {
  it('reads the day a lock falls on in Romania, even when it is still the evening before in UTC', () => {
    // 1 July 2027, 00:00 in Bucharest (summer time) is 30 June, 21:00 UTC.
    expect(lockDayOf('2027-06-30T21:00:00Z')).toBe('2027-07-01');
  });

  it('gives an empty date field when there is no lock date', () => {
    expect(lockDayOf(null)).toBe('');
  });

  it('asks Postgres for the start of the picked day, Romanian time', () => {
    expect(lockTimeOf('2027-07-01')).toBe('2027-07-01 00:00:00 Europe/Bucharest');
  });

  it('writes the lock date as people read it, in the interface language', () => {
    expect(lockDateText('2027-06-30T21:00:00Z', 'en-GB')).toBe('1 July 2027');
  });
});
