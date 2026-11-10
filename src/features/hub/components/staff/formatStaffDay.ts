/**
 * formatStaffDay: writes a calendar day for the Writers' hub staff page (bundles GAPS-12c and
 * GAPS-12d). Who calls it: PromptItem and CallItem.
 */
import { dateLocaleFor } from '@/lib/romania-time';

/**
 * Writes a calendar day ("2026-11-09") the reader's way ("9 November 2026").
 *
 * @param day - the day, YYYY-MM-DD
 * @param language - the interface language
 * @returns the day's text
 */
export function formatStaffDay(day: string, language: string): string {
  // The day has no time zone of its own, so it is read and written as UTC to keep it unmoved.
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${day}T00:00:00Z`));
}
