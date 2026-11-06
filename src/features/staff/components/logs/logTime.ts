/**
 * logTime: a log row's time in the page's language, to the second, for Staff › Logs (bundle
 * LOGS-1, part d). Who calls it: CallsView, FailuresView and CrashesView.
 */

/**
 * Formats one time.
 *
 * @param isoTime - the time as the database gave it
 * @param language - the page's language code
 * @returns for example "6 Nov 2026, 14:02:31"
 */
export function logTime(isoTime: string, language: string): string {
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'medium' }).format(
    new Date(isoTime),
  );
}
