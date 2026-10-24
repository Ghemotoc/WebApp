/**
 * The date a deleted story or chapter is deleted for good, as the screen says it
 * (story S1-E3-05; "gone for good on 15 Nov", board Chapters 4.4).
 *
 * The rule: content_purge_days (30, a public setting) after the deletion, counted in Romanian
 * time, the same way delete_my_story() works it out. The screen uses the fixed 30 so it never
 * has to wait for a settings read; the database's own date is the one that counts.
 * Who calls it: DeleteStoryControl and RecentlyDeleted.
 */
import { dateLocaleFor } from '@/lib/romania-time';

/** Days a deleted story can be undone (settings.content_purge_days, S1-E3-05). */
export const CONTENT_PURGE_DAYS = 30;

/**
 * Formats the purge date for a deletion time.
 *
 * @param deletedAt - when the story was deleted, as an ISO timestamp
 * @param language - the interface language, for the date's words
 * @returns for example "15 November 2026" (British order, CTO, 24 Oct 2026) or "15 noiembrie 2026"
 */
export function purgeDateFor(deletedAt: string, language: string): string {
  const purgeDate = new Date(deletedAt);
  purgeDate.setDate(purgeDate.getDate() + CONTENT_PURGE_DAYS);
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Bucharest',
  }).format(purgeDate);
}
