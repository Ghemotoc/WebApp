/**
 * The signed-in person's optional birthday month: reading and saving it (story S1-E2-12;
 * QA-7, 6 Nov 2026: the month only).
 *
 * Why only a month: the year of birth from sign-up sits on the same profile row, and a day and
 * month beside it would make a full date of birth, which CLAUDE.md rule 5 forbids (QA-7,
 * finding P1; CTO decision, 6 Nov 2026).
 * Who calls it: hooks/useMyBirthday.ts, and the staff "Correct birthday" action through
 * BirthdayPicker's choice.
 * What it calls: the person's own profile row (the profiles_select_own policy) and
 * set_my_birthday() (supabase/migrations/…_qa7_01_birthday_month_only.sql). Nobody else reads it:
 * public views never carry it. Nothing here logs it (CLAUDE.md rule 12).
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** A birthday: a month (1 to 12), or null when none is saved. Never a day, never a year. */
export interface Birthday {
  month: number | null;
}

/** The month as the drop-down holds it: '1' to '12', '' for none. */
export interface BirthdayChoice {
  month: string;
}

/**
 * Turns the drop-down's text into a birthday to save.
 *
 * @param choice - the drop-down's value
 * @returns the month as a number, or null for "Not set"
 */
export function birthdayFromChoice(choice: BirthdayChoice): Birthday {
  return { month: choice.month === '' ? null : Number(choice.month) };
}

/**
 * Reads the person's own birthday month.
 *
 * @param client - the shared Supabase client
 * @returns the saved month, or null
 * @throws Error when the profile can't be read
 */
export async function fetchMyBirthday(client: AppSupabaseClient): Promise<Birthday> {
  // The policy returns only the caller's own row, so no filter is needed.
  const { data, error } = await client.from('profiles').select('birthday_month').maybeSingle();
  if (error !== null) throw new Error(`Could not read the birthday: ${error.message}`);
  return { month: data?.birthday_month ?? null };
}

/**
 * Saves, or clears, the person's own birthday month.
 *
 * @param client - the shared Supabase client
 * @param birthday - the month, or null to clear it
 * @returns what is saved now
 * @throws Error when the database refuses it or can't be reached
 */
export async function saveMyBirthday(
  client: AppSupabaseClient,
  birthday: Birthday,
): Promise<Birthday> {
  const { error } = await client.rpc('set_my_birthday', {
    wanted_month: birthday.month ?? undefined,
  });
  if (error !== null) throw new Error(`Could not save the birthday: ${error.message}`);
  return { month: birthday.month };
}
