/**
 * The reader's private reading streak (bundle IDEAS-1, part b; idea IDEA-20261031-13).
 *
 * Who calls it: the hooks in ../hooks/ (the Library note and the chapter reader's minute counter).
 * What it calls next: the functions in supabase/migrations/…_ideas1_b_reading_streak.sql. Each
 * reads or writes the caller's own rows only; nobody else, staff included, sees them.
 */
import type { AppSupabaseClient } from '@/lib/supabase';

/** The streak as the Library note shows it; null from fetchReadingHabit while it is off. */
export interface ReadingHabit {
  /** The daily target in minutes, or null when the reader hasn't picked one. */
  target: number | null;
  remindersOn: boolean;
  /** "HH:MM" on the reader's clock, or null. */
  reminderTime: string | null;
  /** Days with any reading since Monday, on the reader's clock. */
  daysThisWeek: number;
  minutesToday: number;
  /** Under 18 (or age unknown): no reminder between 22:00 and 07:00 (quiet hours, Q50). */
  isUnder18: boolean;
}

/** What the reader can change. */
export interface ReadingHabitChoices {
  target: number | null;
  remindersOn: boolean;
  reminderTime: string | null;
}

/** The message the database raises for a reminder in quiet hours, so the note can explain it. */
export const quietHoursRefusal = 'quiet_hours';

/**
 * The device's time zone, so "today" and the reminder follow the reader's own clock.
 *
 * @returns an IANA name such as Europe/Bucharest; Romania's when the browser doesn't say
 */
export function deviceTimeZone(): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return zone === '' ? 'Europe/Bucharest' : zone;
}

/**
 * Reads the caller's streak.
 *
 * @param client - the signed-in Supabase client
 * @returns the streak, or null while it is off
 * @throws Error when the database refuses
 */
export async function fetchReadingHabit(client: AppSupabaseClient): Promise<ReadingHabit | null> {
  const { data, error } = await client.rpc('my_reading_habit');
  if (error !== null) throw new Error(`Could not read your reading streak: ${error.message}`);
  return data as unknown as ReadingHabit | null;
}

/**
 * Turns the streak on, with no target and no reminder yet.
 *
 * @param client - the signed-in Supabase client
 * @throws Error when the database refuses
 */
export async function startReadingHabit(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.rpc('start_reading_habit', { device_time_zone: deviceTimeZone() });
  if (error !== null) throw new Error(`Could not turn the reading streak on: ${error.message}`);
}

/**
 * Keeps the daily target and the reminder.
 *
 * @param client - the signed-in Supabase client
 * @param choices - the target, whether reminders are on and their time
 * @throws Error whose message is quietHoursRefusal for an under-18's reminder in quiet hours, or
 *   another message when the database refuses
 */
export async function saveReadingHabit(
  client: AppSupabaseClient,
  choices: ReadingHabitChoices,
): Promise<void> {
  // The generated argument types don't say "may be null", but the function takes null for "no
  // target" and "no time", so the two casts only quiet the type check.
  const { error } = await client.rpc('save_reading_habit', {
    wanted_target: choices.target as number,
    wanted_reminders_on: choices.remindersOn,
    wanted_reminder_time: choices.reminderTime as string,
    device_time_zone: deviceTimeZone(),
  });
  if (error === null) return;
  if (error.message === quietHoursRefusal) throw new Error(quietHoursRefusal);
  throw new Error(`Could not save your reading target: ${error.message}`);
}

/**
 * Turns the streak off and deletes the minutes already counted.
 *
 * @param client - the signed-in Supabase client
 * @throws Error when the database refuses
 */
export async function stopReadingHabit(client: AppSupabaseClient): Promise<void> {
  const { error } = await client.rpc('stop_reading_habit');
  if (error !== null) throw new Error(`Could not turn the reading streak off: ${error.message}`);
}

/**
 * Adds one minute of reading to today.
 *
 * @param client - the signed-in Supabase client
 * @returns the minutes today (0 when the streak is off)
 * @throws Error when the database refuses
 */
export async function addReadingMinute(client: AppSupabaseClient): Promise<number> {
  const { data, error } = await client.rpc('add_reading_minute');
  if (error !== null) throw new Error(`Could not count a minute of reading: ${error.message}`);
  return data;
}
