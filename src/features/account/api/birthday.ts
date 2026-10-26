/**
 * The signed-in person's optional birthday: reading and saving it (story S1-E2-12; Robert,
 * 25 Oct 2026, 07:08 to 07:11: a day and month only, never the year).
 *
 * Who calls it: hooks/useMyBirthday.ts.
 * What it calls: the person's own profile row (the profiles_select_own policy) and
 * set_my_birthday() (supabase/migrations/…_s1_e2_12_birthday_and_anniversary.sql). Nobody else
 * reads it: public views never carry it. Nothing here logs it (CLAUDE.md rule 12).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** A birthday: a month, and a day only with a month. Both null when none is saved. */
export interface Birthday {
  month: number | null;
  day: number | null;
}

/** How many days each month can have (29 for February: the year is never stored). */
export const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** A month and a day as the drop-downs hold them: '1' to '12' and '1' to '31', '' for none. */
export interface BirthdayChoice {
  month: string;
  day: string;
}

/**
 * Turns the drop-downs' text into a birthday to save; a day only goes with a month.
 *
 * @param choice - the drop-downs' values
 * @returns the month and day as numbers, or nulls
 */
export function birthdayFromChoice(choice: BirthdayChoice): Birthday {
  if (choice.month === '') return { month: null, day: null };
  return { month: Number(choice.month), day: choice.day === '' ? null : Number(choice.day) };
}

/**
 * Reads the person's own birthday.
 *
 * @param client - the shared Supabase client
 * @returns the saved birthday, or nulls
 * @throws Error when the profile can't be read
 */
export async function fetchMyBirthday(client: AppSupabaseClient): Promise<Birthday> {
  // The policy returns only the caller's own row, so no filter is needed.
  const { data, error } = await client
    .from('profiles')
    .select('birthday_month, birthday_day')
    .maybeSingle();
  if (error !== null) throw new Error(`Could not read the birthday: ${error.message}`);
  return { month: data?.birthday_month ?? null, day: data?.birthday_day ?? null };
}

/**
 * Saves, or clears, the person's own birthday.
 *
 * @param client - the shared Supabase client
 * @param birthday - the month (null clears both) and the optional day
 * @returns what is saved now
 * @throws Error when the database refuses it or can't be reached
 */
export async function saveMyBirthday(
  client: AppSupabaseClient,
  birthday: Birthday,
): Promise<Birthday> {
  const { error } = await client.rpc('set_my_birthday', {
    wanted_month: birthday.month ?? undefined,
    wanted_day: birthday.day ?? undefined,
  });
  if (error !== null) throw new Error(`Could not save the birthday: ${error.message}`);
  return { month: birthday.month, day: birthday.month === null ? null : birthday.day };
}
