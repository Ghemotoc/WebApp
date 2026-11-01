/**
 * Dates as the forums show them (bundle FORUMS-1, part b; S1-E8-02; board 5.2: "14 Oct, 19:02",
 * "on 14 October").
 *
 * Who calls it: ThreadPage's parts, ForumPostCard and ThreadRow. Locale-aware through Intl, in
 * Romanian time, the platform's home zone (Robert, 17 Oct 2026).
 */

/** The zone every forum time is shown in. */
const romanianTime = 'Europe/Bucharest';

/**
 * A post's time: day, short month, hour and minute.
 *
 * @param isoDate - when it was written
 * @param language - the interface language
 * @returns for example "14 Oct, 19:02"
 */
export function postTime(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: romanianTime,
  }).format(new Date(isoDate));
}

/**
 * A thread's start day: day and full month.
 *
 * @param isoDate - when it was started
 * @param language - the interface language
 * @returns for example "14 October"
 */
export function threadDay(isoDate: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    day: 'numeric',
    month: 'long',
    timeZone: romanianTime,
  }).format(new Date(isoDate));
}
