/**
 * Checks the reading streak's target and reminder before they are saved (bundle IDEAS-1, part b;
 * idea IDEA-20261031-13). The database checks the same rules again; this only lets the form say
 * what to fix at once, next to the field.
 *
 * Who calls it: the Library's ReadingHabitSettings. Tested in habitChoices.test.ts.
 */
import type { ReadingHabitChoices } from '../api/readingHabit';

/** What the form holds, as typed. */
export interface HabitForm {
  target: string;
  remindersOn: boolean;
  reminderTime: string;
}

/** Why a form can't be saved yet, as a key under library:habit. */
export type HabitProblem = 'targetOutOfRange' | 'needsTarget' | 'needsTime' | 'quietHoursError';

/**
 * Whether a "HH:MM" time is in the under-18 quiet hours, 22:00 to 07:00 (Q50, 16 Oct 2026).
 *
 * @param time - the time as the time field gives it
 * @returns true inside quiet hours
 */
export function isInQuietHours(time: string): boolean {
  return time >= '22:00' || time < '07:00';
}

/**
 * Turns the typed target into minutes.
 *
 * @param typed - what is in the field
 * @returns null for an empty field, the number, or NaN for anything else
 */
function targetMinutes(typed: string): number | null {
  if (typed.trim() === '') return null;
  return /^\d+$/.test(typed.trim()) ? Number(typed.trim()) : Number.NaN;
}

/**
 * The reminder's problem, if any: it needs a target to measure against and a time, and for
 * under-18s a time outside quiet hours.
 *
 * @param form - what is typed and ticked
 * @param target - the target in minutes, or null
 * @param isUnder18 - whether quiet hours apply
 * @returns the problem, or null when the reminder is fine (or off)
 */
function reminderProblem(
  form: HabitForm,
  target: number | null,
  isUnder18: boolean,
): HabitProblem | null {
  if (!form.remindersOn) return null;
  if (target === null) return 'needsTarget';
  if (form.reminderTime === '') return 'needsTime';
  if (isUnder18 && isInQuietHours(form.reminderTime)) return 'quietHoursError';
  return null;
}

/**
 * Checks the form.
 *
 * @param form - what is typed and ticked
 * @param isUnder18 - whether quiet hours apply
 * @returns the choices to save, or the first problem to show
 */
export function checkHabitForm(
  form: HabitForm,
  isUnder18: boolean,
): { choices: ReadingHabitChoices } | { problem: HabitProblem } {
  // Step 1: a target, if there is one, is a whole number from 1 to 600.
  const target = targetMinutes(form.target);
  if (target !== null && !(target >= 1 && target <= 600)) return { problem: 'targetOutOfRange' };
  // Step 2: the reminder's own rules.
  const problem = reminderProblem(form, target, isUnder18);
  if (problem !== null) return { problem };
  // Step 3: what to save; an empty time is "no time".
  const reminderTime = form.reminderTime === '' ? null : form.reminderTime;
  return { choices: { target, remindersOn: form.remindersOn, reminderTime } };
}
