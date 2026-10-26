/**
 * Tests for the optional birthday (story S1-E2-12). Supabase is a small fake here; the database
 * rules are in supabase/tests/database/159-birthday-and-anniversary.test.sql.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AppSupabaseClient } from '@/lib/supabase';

import { birthdayFromChoice, daysInMonth, saveMyBirthday } from './birthday';

describe('birthdayFromChoice', () => {
  it('keeps a month and a day', () => {
    expect(birthdayFromChoice({ month: '3', day: '14' })).toEqual({ month: 3, day: 14 });
  });

  it('keeps a month without a day', () => {
    expect(birthdayFromChoice({ month: '3', day: '' })).toEqual({ month: 3, day: null });
  });

  it('drops the day when no month is chosen, which removes the birthday', () => {
    expect(birthdayFromChoice({ month: '', day: '14' })).toEqual({ month: null, day: null });
  });
});

describe('daysInMonth', () => {
  it('lets February have 29 days, because the year is never stored', () => {
    expect(daysInMonth[1]).toBe(29);
  });
});

describe('saveMyBirthday', () => {
  it('sends the month and day and never a year', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { month: 3, day: 14 }, error: null });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(saveMyBirthday(client, { month: 3, day: 14 })).resolves.toEqual({
      month: 3,
      day: 14,
    });
    expect(rpc).toHaveBeenCalledWith('set_my_birthday', { wanted_month: 3, wanted_day: 14 });
  });

  it('throws when the database refuses, so the form shows its message', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: { message: 'birthday_invalid' } });
    const client = { rpc } as unknown as AppSupabaseClient;
    await expect(saveMyBirthday(client, { month: 2, day: 30 })).rejects.toThrow('birthday_invalid');
  });
});
