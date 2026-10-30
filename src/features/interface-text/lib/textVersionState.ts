/**
 * Sorts the versions of one key in one locale into draft, live, scheduled and earlier (story
 * S1-E11-18 criteria 5 and 6), with the same live rule as the database: the latest published
 * version whose "show from" date has come (interface_text_live()).
 * Who calls it: LocaleTextPanel.
 */
import type { TextVersion } from '../api/interfaceTextStore';

/** One locale's versions, sorted. */
export interface LocaleVersions {
  draft: TextVersion | null;
  /** The live version; a reset means the file text shows. */
  live: TextVersion | null;
  scheduled: TextVersion | null;
  /** Earlier texts that can be restored, newest first (resets left out). */
  earlier: TextVersion[];
}

/**
 * Compares two published versions, newest first.
 *
 * @returns a sort number
 */
function newestFirst(first: TextVersion, second: TextVersion): number {
  const byDate = (second.showFrom ?? '').localeCompare(first.showFrom ?? '');
  return byDate !== 0 ? byDate : (second.publishedAt ?? '').localeCompare(first.publishedAt ?? '');
}

/**
 * Sorts one locale's versions.
 *
 * @param versions - every version of the key
 * @param locale - the locale to sort
 * @param today - today in Romania (YYYY-MM-DD)
 * @returns the sorted versions
 */
export function sortLocaleVersions(
  versions: TextVersion[],
  locale: string,
  today: string,
): LocaleVersions {
  const own = versions.filter((version) => version.locale === locale);
  const published = own.filter((version) => version.status === 'published').sort(newestFirst);
  const started = published.filter((version) => (version.showFrom ?? '') <= today);
  const live = started[0] ?? null;
  const scheduled = published.filter((version) => (version.showFrom ?? '') > today).at(-1) ?? null;
  return {
    draft: own.find((version) => version.status === 'draft') ?? null,
    live,
    scheduled,
    earlier: started.filter((version) => version !== live && !version.isReset),
  };
}
