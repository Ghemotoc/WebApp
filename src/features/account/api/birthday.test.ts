/**
 * Tests for the optional birthday month (story S1-E2-12; QA-7). Supabase is a small fake here;
 * the database rules are in supabase/tests/database/159-birthday-and-anniversary.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { birthdayFromChoice, saveMyBirthday } from './birthday';

describe('birthdayFromChoice', () => {
  it('keeps a chosen month', () => {
    expect(birthdayFromChoice({ month: '3' })).toEqual({ month: 3 });
  });

  it('turns "Not set" into no birthday, which removes it', () => {
    expect(birthdayFromChoice({ month: '' })).toEqual({ month: null });
  });
});

describe('saveMyBirthday', () => {
  it('sends the month only, never a day or a year', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { month: 3 }, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(saveMyBirthday(client, { month: 3 })).resolves.toEqual({ month: 3 });
    expect(rpc).toHaveBeenCalledWith('set_my_birthday', { wanted_month: 3 });
  });

  it('throws when the database refuses, so the form shows its message', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'birthday_invalid' } });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(saveMyBirthday(client, { month: 13 })).rejects.toThrow('birthday_invalid');
  });
});
