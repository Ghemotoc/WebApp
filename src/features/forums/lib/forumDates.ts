/**
 * Dates as the forums show them (bundle FORUMS-1, part b; S1-E8-02; board 5.2: "14 Oct, 19:02",
 * "on 14 October").
 *
 * Who calls it: ThreadPage's parts, ForumPostCard and ThreadRow. Locale-aware through Intl, on the
 * viewer's own clock (Robert, 20 Nov 2026, 18:19 UTC: every time the app shows is in local time;
 * replaces Romanian time for every viewer, 17 Oct 2026). The day and the time come from the same
 * clock, so a post's day and its thread's day always agree.
 */

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
  }).format(new Date(isoDate));
}
