/**
 * Small formatters for the profile page (story S1-E5-05): the month someone joined and the
 * short numbers in the stats row, both in the reader's language (DoD: dates, numbers and plurals
 * use locale-aware formatting).
 *
 * Who calls it: ProfileHeader and ProfileStats.
 */
import { dateLocaleFor, ROMANIA_TIME_ZONE } from '@/lib/romania-time';

/**
 * The month and year someone joined: "May 2026" or "mai 2026", by Romania's calendar (Q7).
 *
 * @param joinedAt - when the account was made, as stored
 * @param language - the interface language
 * @returns the text
 */
export function formatJoinedMonth(joinedAt: string, language: string): string {
  return new Intl.DateTimeFormat(dateLocaleFor(language), {
    timeZone: ROMANIA_TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(new Date(joinedAt));
}

/**
 * A count in the stats row: exact up to 9,999, then short ("12k", "1.9k"), as on the board.
 *
 * @param count - the number
 * @param language - the interface language
 * @returns the text
 */
export function formatStatNumber(count: number, language: string): string {
  const notation = count >= 10_000 ? 'compact' : 'standard';
  return new Intl.NumberFormat(dateLocaleFor(language), {
    notation,
    maximumFractionDigits: 1,
  }).format(count);
}

/**
 * The initials drawn in the avatar circle while picture uploads are off (decided 23 Oct 2026):
 * the first letter of the first two words of the name, or its first letter.
 *
 * @param name - the pen name or username
 * @returns one or two capital letters
 */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== '');
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? '');
  return letters.join('').toLocaleUpperCase();
}
